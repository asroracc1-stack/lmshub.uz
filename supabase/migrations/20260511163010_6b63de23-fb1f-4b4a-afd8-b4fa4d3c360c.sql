-- 1) Fix existing public-signup users so they can sign in with username
-- Change auth.users.email to the synthetic username@asror.local that the
-- frontend uses for signInWithPassword.
UPDATE auth.users u
SET email = p.username || '@asror.local',
    email_confirmed_at = COALESCE(u.email_confirmed_at, now())
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'user'
WHERE u.id = p.id
  AND u.email NOT LIKE '%@asror.local';

-- 2) Activate Pro pack (IELTS unlocked → speaking included) for the first
-- registered public user (nozliya123).
DO $$
DECLARE
  _uid uuid;
  _pack uuid;
BEGIN
  SELECT id INTO _uid FROM public.profiles WHERE username = 'nozliya123';
  SELECT id INTO _pack FROM public.subscription_packs WHERE code = 'pro';
  IF _uid IS NOT NULL AND _pack IS NOT NULL THEN
    UPDATE public.user_subscriptions SET is_active = false WHERE user_id = _uid AND is_active = true;
    INSERT INTO public.user_subscriptions (user_id, pack_id, starts_at, expires_at, is_active, status)
    VALUES (_uid, _pack, now(), now() + interval '30 days', true, 'active');
  END IF;
END $$;