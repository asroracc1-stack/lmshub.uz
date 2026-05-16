
-- Payment manager config table
CREATE TABLE IF NOT EXISTS public.payment_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  telegram_username text,
  telegram_chat_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  approved_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  last_assigned_at timestamptz,
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin manages payment_managers" ON public.payment_managers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "payment_manager reads own row" ON public.payment_managers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_payment_managers_updated
  BEFORE UPDATE ON public.payment_managers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS pack_id uuid REFERENCES public.subscription_packs(id),
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.user_subscriptions(id),
  ADD COLUMN IF NOT EXISTS transaction_ref text,
  ADD COLUMN IF NOT EXISTS telegram_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS user_comment text,
  ADD COLUMN IF NOT EXISTS manager_comment text,
  ADD COLUMN IF NOT EXISTS assigned_manager_id uuid REFERENCES public.payment_managers(id);

ALTER TABLE public.payments ALTER COLUMN organization_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_status_created ON public.payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_pack ON public.payments(pack_id);

CREATE POLICY "payment_manager reads platform payments" ON public.payments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'payment_manager'));

CREATE POLICY "payment_manager updates platform payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'payment_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'payment_manager'));

DROP POLICY IF EXISTS "students create own payments" ON public.payments;
CREATE POLICY "users create own payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "payment_manager reads buyer profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'payment_manager'));

CREATE POLICY "payment_manager reads subs" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'payment_manager'));
CREATE POLICY "payment_manager updates subs" ON public.user_subscriptions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'payment_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'payment_manager'));

CREATE POLICY "payment_manager reads packs" ON public.subscription_packs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'payment_manager'));

-- Round-robin
CREATE OR REPLACE FUNCTION public.next_payment_manager()
RETURNS TABLE(id uuid, user_id uuid, display_name text, telegram_username text, telegram_chat_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pm record;
BEGIN
  SELECT pm.* INTO _pm FROM public.payment_managers pm
   WHERE pm.is_active = true AND pm.is_default = true
   ORDER BY COALESCE(pm.last_assigned_at,'epoch'::timestamptz) ASC LIMIT 1;
  IF _pm.id IS NULL THEN
    SELECT pm.* INTO _pm FROM public.payment_managers pm
     WHERE pm.is_active = true
     ORDER BY COALESCE(pm.last_assigned_at,'epoch'::timestamptz) ASC LIMIT 1;
  END IF;
  IF _pm.id IS NULL THEN RETURN; END IF;
  UPDATE public.payment_managers SET last_assigned_at = now() WHERE id = _pm.id;
  RETURN QUERY SELECT _pm.id, _pm.user_id, _pm.display_name, _pm.telegram_username, _pm.telegram_chat_id;
END $$;

-- Approve
CREATE OR REPLACE FUNCTION public.approve_payment(_payment_id uuid, _comment text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p record; _pack record; _new_sub_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'payment_manager')) THEN
    RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _p FROM public.payments WHERE id = _payment_id;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF _p.status IN ('paid','completed') THEN RAISE EXCEPTION 'Already approved'; END IF;

  IF _p.pack_id IS NOT NULL THEN
    SELECT * INTO _pack FROM public.subscription_packs WHERE id = _p.pack_id;
    IF _pack.id IS NULL THEN RAISE EXCEPTION 'Pack not found'; END IF;
    UPDATE public.user_subscriptions SET is_active=false WHERE user_id=_p.student_id AND is_active=true;
    IF _p.subscription_id IS NOT NULL THEN
      UPDATE public.user_subscriptions SET is_active=true, status='active', starts_at=now(),
             expires_at=now()+(_pack.duration_days||' days')::interval, granted_by=auth.uid()
       WHERE id = _p.subscription_id;
      _new_sub_id := _p.subscription_id;
    ELSE
      INSERT INTO public.user_subscriptions(user_id,pack_id,starts_at,expires_at,is_active,status,granted_by)
      VALUES (_p.student_id,_p.pack_id,now(),now()+(_pack.duration_days||' days')::interval,true,'active',auth.uid())
      RETURNING id INTO _new_sub_id;
    END IF;
  END IF;

  UPDATE public.payments
     SET status='paid', reviewed_at=now(), reviewed_by=auth.uid(),
         manager_comment=COALESCE(_comment,manager_comment),
         subscription_id=COALESCE(subscription_id,_new_sub_id)
   WHERE id=_payment_id;

  UPDATE public.payment_managers SET approved_count=approved_count+1, last_active_at=now() WHERE user_id=auth.uid();

  PERFORM public.send_notification(_p.student_id,'✅ To''lovingiz tasdiqlandi',
    COALESCE('Paket faollashtirildi: '||_pack.name,'To''lovingiz qabul qilindi'),'success','/student/payment');
END $$;

-- Reject
CREATE OR REPLACE FUNCTION public.reject_payment(_payment_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p record;
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'payment_manager')) THEN
    RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _p FROM public.payments WHERE id=_payment_id;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  UPDATE public.payments SET status='rejected', reviewed_at=now(), reviewed_by=auth.uid(),
         manager_comment=COALESCE(_reason,manager_comment), error_note=_reason WHERE id=_payment_id;
  IF _p.subscription_id IS NOT NULL THEN
    UPDATE public.user_subscriptions SET is_active=false, status='rejected' WHERE id=_p.subscription_id;
  END IF;
  UPDATE public.payment_managers SET rejected_count=rejected_count+1, last_active_at=now() WHERE user_id=auth.uid();
  PERFORM public.send_notification(_p.student_id,'❌ To''lov rad etildi',
    COALESCE(_reason,'Iltimos qayta urinib ko''ring'),'warning','/student/payment');
END $$;

-- Receipts storage
DROP POLICY IF EXISTS "users upload own receipts" ON storage.objects;
CREATE POLICY "users upload own receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id='receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "users read own receipts" ON storage.objects;
CREATE POLICY "users read own receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id='receipts' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'payment_manager')
  ));
