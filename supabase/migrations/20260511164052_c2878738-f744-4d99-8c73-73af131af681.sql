
-- 1) PRACTICE SESSIONS (kunlik daqiqalar)
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity text NOT NULL DEFAULT 'general', -- reading|listening|writing|speaking|sat|milliy|vocab|general
  minutes numeric NOT NULL CHECK (minutes >= 0),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_practice_user_date ON public.practice_sessions(user_id, created_at DESC);
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own practice"
ON public.practice_sessions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users read own practice"
ON public.practice_sessions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'payment_manager'));

-- log_practice RPC
CREATE OR REPLACE FUNCTION public.log_practice(_minutes numeric, _activity text DEFAULT 'general', _meta jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauth'; END IF;
  IF _minutes <= 0 OR _minutes > 240 THEN RETURN NULL; END IF;
  INSERT INTO public.practice_sessions(user_id, minutes, activity, meta)
  VALUES (auth.uid(), _minutes, COALESCE(_activity,'general'), COALESCE(_meta,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;

-- Practice leaderboard (week/month/6month/year/all)
CREATE OR REPLACE FUNCTION public.get_practice_leaderboard(_period text DEFAULT 'week', _limit int DEFAULT 50)
RETURNS TABLE(user_id uuid, full_name text, username text, avatar_url text, total_minutes numeric, rank bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _since timestamptz; _until timestamptz := now() + interval '1 day'; _now timestamptz := now(); _half int;
BEGIN
  IF _period='week' THEN _since := date_trunc('week', _now);
  ELSIF _period='month' THEN _since := date_trunc('month', _now);
  ELSIF _period='6month' THEN
    _half := CASE WHEN extract(month from _now)::int <= 6 THEN 1 ELSE 7 END;
    _since := make_timestamptz(extract(year from _now)::int, _half, 1, 0, 0, 0);
  ELSIF _period='year' THEN _since := date_trunc('year', _now);
  ELSE _since := 'epoch'::timestamptz; END IF;
  RETURN QUERY
  WITH agg AS (
    SELECT ps.user_id AS uid, SUM(ps.minutes)::numeric AS mins
    FROM public.practice_sessions ps
    WHERE ps.created_at >= _since AND ps.created_at < _until
    GROUP BY ps.user_id
  )
  SELECT p.id, p.full_name, p.username, p.avatar_url, a.mins,
         ROW_NUMBER() OVER (ORDER BY a.mins DESC) AS rank
  FROM agg a JOIN public.profiles p ON p.id = a.uid
  WHERE a.mins > 0 ORDER BY a.mins DESC LIMIT _limit;
END $$;

-- 2) REFERRALS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_bonus_paid boolean NOT NULL DEFAULT false;

-- generate stable codes for existing users
UPDATE public.profiles
   SET referral_code = upper(substr(md5(id::text || username),1,8))
 WHERE referral_code IS NULL;

CREATE OR REPLACE FUNCTION public.gen_referral_code() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(md5(NEW.id::text || coalesce(NEW.username,'') || extract(epoch from now())::text),1,8));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_gen_referral ON public.profiles;
CREATE TRIGGER trg_gen_referral BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.gen_referral_code();

-- Apply referral code (called after signup, by the new user)
CREATE OR REPLACE FUNCTION public.apply_referral(_code text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _ref uuid;
BEGIN
  IF _uid IS NULL OR _code IS NULL THEN RETURN false; END IF;
  SELECT id INTO _ref FROM public.profiles WHERE referral_code = upper(_code) AND id <> _uid;
  IF _ref IS NULL THEN RETURN false; END IF;
  UPDATE public.profiles SET referred_by = _ref
   WHERE id = _uid AND referred_by IS NULL;
  RETURN FOUND;
END $$;

-- Award referral bonus (5 coins each side) when invitee makes first activity
CREATE OR REPLACE FUNCTION public.maybe_pay_referral_bonus(_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _ref uuid; _paid boolean;
BEGIN
  SELECT referred_by, referral_bonus_paid INTO _ref, _paid FROM public.profiles WHERE id = _user_id;
  IF _ref IS NULL OR _paid THEN RETURN; END IF;
  PERFORM public.award_coins(_user_id, 5, 'Taklif bonusi 🎉', 'referral', jsonb_build_object('referrer', _ref));
  PERFORM public.award_coins(_ref, 5, 'Do''stingiz qo''shildi 🎉', 'referral', jsonb_build_object('invitee', _user_id));
  UPDATE public.profiles SET referral_bonus_paid = true WHERE id = _user_id;
END $$;

-- Trigger after first practice session
CREATE OR REPLACE FUNCTION public.on_practice_referral() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.maybe_pay_referral_bonus(NEW.user_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_practice_ref ON public.practice_sessions;
CREATE TRIGGER trg_practice_ref AFTER INSERT ON public.practice_sessions
FOR EACH ROW EXECUTE FUNCTION public.on_practice_referral();

-- 3) TELEGRAM LINKS (super admin CRUD; everyone read active)
CREATE TABLE IF NOT EXISTS public.telegram_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('bot','channel')),
  name text NOT NULL DEFAULT 'Telegram bot',
  username text NOT NULL,
  bot_token text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

-- Public view that hides token
DROP VIEW IF EXISTS public.telegram_links_public;
CREATE VIEW public.telegram_links_public WITH (security_invoker=on) AS
SELECT id, kind, name, username, description, is_active, created_at FROM public.telegram_links;

CREATE POLICY "auth read active links"
ON public.telegram_links FOR SELECT TO authenticated
USING (is_active = true OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "super admin manage links insert"
ON public.telegram_links FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin manage links update"
ON public.telegram_links FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin manage links delete"
ON public.telegram_links FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_tl_updated BEFORE UPDATE ON public.telegram_links
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) FEEDBACK (Izoh qoldirish) -- simple
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert feedback" ON public.user_feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user read own feedback" ON public.user_feedback FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

-- 5) Manual coin grant — wrapper that pack_manager / super_admin can call
CREATE OR REPLACE FUNCTION public.grant_coins_to_user(_user_id uuid, _amount integer, _reason text DEFAULT 'Mukofot')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'payment_manager')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN public.award_coins(_user_id, _amount, _reason, 'manual_grant', jsonb_build_object('by', auth.uid()));
END $$;
