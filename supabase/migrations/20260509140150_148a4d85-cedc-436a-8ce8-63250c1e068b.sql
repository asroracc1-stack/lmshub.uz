
-- Reject subscription (super_admin)
CREATE OR REPLACE FUNCTION public.reject_subscription(_sub_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.user_subscriptions
     SET is_active = false, status = 'rejected'
   WHERE id = _sub_id;
END;
$$;
