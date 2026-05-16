-- Restrict mock test management to super_admin only
DROP POLICY IF EXISTS "org managers manage mocks" ON public.mock_tests;
DROP POLICY IF EXISTS "managers manage questions" ON public.mock_questions;

CREATE POLICY "super_admin manages questions"
ON public.mock_questions FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Pack subscription RPC: user can subscribe to free pack instantly, paid creates pending sub
CREATE OR REPLACE FUNCTION public.subscribe_to_pack(_pack_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _pack record;
  _sub_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO _pack FROM public.subscription_packs WHERE id = _pack_id AND is_active = true;
  IF _pack.id IS NULL THEN RAISE EXCEPTION 'Pack not found'; END IF;

  -- Deactivate previous active subs
  UPDATE public.user_subscriptions SET is_active = false
   WHERE user_id = _uid AND is_active = true;

  IF _pack.code = 'free' THEN
    INSERT INTO public.user_subscriptions(user_id, pack_id, started_at, expires_at, is_active, status)
    VALUES (_uid, _pack.id, now(), now() + interval '100 years', true, 'active')
    RETURNING id INTO _sub_id;
  ELSE
    -- Paid: create a pending subscription waiting for payment confirmation
    INSERT INTO public.user_subscriptions(user_id, pack_id, started_at, expires_at, is_active, status)
    VALUES (_uid, _pack.id, now(), now() + (_pack.duration_days || ' days')::interval, false, 'pending')
    RETURNING id INTO _sub_id;
  END IF;

  RETURN _sub_id;
END;
$$;