ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE OR REPLACE FUNCTION public.subscribe_to_pack(_pack_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _pack record;
  _sub_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO _pack FROM public.subscription_packs WHERE id = _pack_id AND is_active = true;
  IF _pack.id IS NULL THEN RAISE EXCEPTION 'Pack not found'; END IF;

  UPDATE public.user_subscriptions SET is_active = false
   WHERE user_id = _uid AND is_active = true;

  IF _pack.code = 'free' THEN
    INSERT INTO public.user_subscriptions(user_id, pack_id, starts_at, expires_at, is_active, status)
    VALUES (_uid, _pack.id, now(), now() + interval '100 years', true, 'active')
    RETURNING id INTO _sub_id;
  ELSE
    INSERT INTO public.user_subscriptions(user_id, pack_id, starts_at, expires_at, is_active, status)
    VALUES (_uid, _pack.id, now(), now() + (_pack.duration_days || ' days')::interval, false, 'pending')
    RETURNING id INTO _sub_id;
  END IF;

  RETURN _sub_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.activate_subscription(_sub_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.user_subscriptions
     SET is_active = true, status = 'active'
   WHERE id = _sub_id;
END;
$function$;