
-- Payment receivers (per-organization recipients for student payments)
CREATE TABLE IF NOT EXISTS public.payment_receivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  role_type text NOT NULL DEFAULT 'admin',
  full_name text NOT NULL,
  card_number text NOT NULL,
  card_holder text NOT NULL,
  telegram_username text,
  telegram_chat_id text,
  payment_purpose text NOT NULL DEFAULT 'monthly_course',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_payment_receivers_org ON public.payment_receivers(organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_payment_receivers_purpose ON public.payment_receivers(payment_purpose) WHERE is_active = true;

ALTER TABLE public.payment_receivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin manages receivers" ON public.payment_receivers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "org members read active receivers" ON public.payment_receivers
  FOR SELECT TO authenticated
  USING (is_active = true AND (organization_id IS NULL OR organization_id = public.current_user_org()));

CREATE POLICY "org managers manage receivers" ON public.payment_receivers
  FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_manager(organization_id))
  WITH CHECK (organization_id IS NOT NULL AND public.is_org_manager(organization_id));

CREATE TRIGGER trg_payment_receivers_updated
  BEFORE UPDATE ON public.payment_receivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add payment_type & receiver link on payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'pack',
  ADD COLUMN IF NOT EXISTS receiver_id uuid REFERENCES public.payment_receivers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_period text;

CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON public.payments(payment_type);

-- RPCs for org managers to approve/reject monthly course payments
CREATE OR REPLACE FUNCTION public.approve_org_payment(_payment_id uuid, _comment text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _p record;
BEGIN
  SELECT * INTO _p FROM public.payments WHERE id = _payment_id;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'super_admin')
       OR (_p.organization_id IS NOT NULL AND public.is_org_manager(_p.organization_id))) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _p.status IN ('paid','completed') THEN RAISE EXCEPTION 'Already approved'; END IF;
  UPDATE public.payments
     SET status='paid', reviewed_at=now(), reviewed_by=auth.uid(),
         manager_comment=COALESCE(_comment, manager_comment)
   WHERE id=_payment_id;
  PERFORM public.send_notification(_p.student_id, '✅ Oylik to''lov tasdiqlandi',
    COALESCE(_comment,'To''lovingiz qabul qilindi. Rahmat!'),'success','/student/payment');
END $$;

CREATE OR REPLACE FUNCTION public.reject_org_payment(_payment_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _p record;
BEGIN
  SELECT * INTO _p FROM public.payments WHERE id = _payment_id;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'super_admin')
       OR (_p.organization_id IS NOT NULL AND public.is_org_manager(_p.organization_id))) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.payments
     SET status='rejected', reviewed_at=now(), reviewed_by=auth.uid(),
         manager_comment=COALESCE(_reason, manager_comment), error_note=_reason
   WHERE id=_payment_id;
  PERFORM public.send_notification(_p.student_id, '❌ Oylik to''lov rad etildi',
    COALESCE(_reason,'Iltimos qayta urinib ko''ring'),'warning','/student/payment');
END $$;
