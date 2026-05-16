
-- 1) Calendar-bucketed leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  _period text DEFAULT 'week',
  _role app_role DEFAULT 'student',
  _organization_id uuid DEFAULT NULL,
  _limit integer DEFAULT 50
)
RETURNS TABLE(user_id uuid, full_name text, username text, avatar_url text, organization_id uuid, total_coins bigint, rank bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _since timestamptz;
  _until timestamptz;
  _now timestamptz := now();
  _half int;
BEGIN
  IF _period = 'week' THEN
    -- ISO week: Monday 00:00 to next Monday
    _since := date_trunc('week', _now);
    _until := _since + interval '7 days';
  ELSIF _period = 'month' THEN
    _since := date_trunc('month', _now);
    _until := _since + interval '1 month';
  ELSIF _period = '6month' THEN
    _half := CASE WHEN extract(month from _now)::int <= 6 THEN 1 ELSE 7 END;
    _since := make_timestamptz(extract(year from _now)::int, _half, 1, 0, 0, 0);
    _until := _since + interval '6 months';
  ELSIF _period = 'year' THEN
    _since := date_trunc('year', _now);
    _until := _since + interval '1 year';
  ELSE
    -- 'all' / umumiy
    _since := 'epoch'::timestamptz;
    _until := _now + interval '1 day';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT ct.student_id AS uid, COALESCE(SUM(ct.amount),0)::bigint AS coins
    FROM public.coin_transactions ct
    WHERE ct.created_at >= _since AND ct.created_at < _until
      AND (_organization_id IS NULL OR ct.organization_id = _organization_id)
    GROUP BY ct.student_id
  )
  SELECT p.id, p.full_name, p.username, p.avatar_url, p.organization_id, a.coins,
         ROW_NUMBER() OVER (ORDER BY a.coins DESC) AS rank
  FROM agg a
  JOIN public.profiles p ON p.id = a.uid
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = _role
  WHERE a.coins > 0
  ORDER BY a.coins DESC
  LIMIT _limit;
END; $$;

-- 2) Harden handle_new_user: never trust client-supplied privileged role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _username text;
  _full_name text;
  _requested text;
  _role text;
  _org_id uuid;
  _is_service boolean;
BEGIN
  _username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', _username);
  _requested := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  _org_id := NULLIF(NEW.raw_user_meta_data->>'organization_id','')::uuid;

  -- Detect service-role context (edge functions create users with service key — auth.uid() is null but JWT role is 'service_role')
  _is_service := (current_setting('request.jwt.claim.role', true) = 'service_role')
              OR (auth.uid() IS NULL AND current_setting('request.jwt.claims', true) IS NULL);

  IF _is_service AND _requested IN ('super_admin','admin','administrator','teacher','parent','student') THEN
    _role := _requested;
  ELSE
    -- Self-signup: forbid privileged escalation
    _role := 'student';
  END IF;

  INSERT INTO public.profiles (id, username, full_name, email, organization_id)
  VALUES (NEW.id, _username, _full_name, NEW.email, _org_id);

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (NEW.id, _role::app_role, _org_id);

  RETURN NEW;
END; $$;

-- 3) Defense-in-depth: prevent users from inserting/updating their own role rows
DROP POLICY IF EXISTS "users cannot self-assign roles" ON public.user_roles;
CREATE POLICY "block self role insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "block self role update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "block self role delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));
