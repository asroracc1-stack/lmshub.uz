
-- 1) Helper fn: which sections does a user have access to (via active subscription)
CREATE OR REPLACE FUNCTION public.user_section_access(_user_id uuid)
RETURNS TABLE(ielts boolean, sat boolean, milliy boolean, pack_code text, expires_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH active AS (
    SELECT sp.code, sp.features, us.expires_at
    FROM public.user_subscriptions us
    JOIN public.subscription_packs sp ON sp.id = us.pack_id
    WHERE us.user_id = _user_id AND us.is_active = true AND us.expires_at > now()
    ORDER BY us.expires_at DESC LIMIT 1
  )
  SELECT
    COALESCE((features->'sections'->>'ielts')::boolean, false) AS ielts,
    COALESCE((features->'sections'->>'sat')::boolean, false) AS sat,
    COALESCE((features->'sections'->>'milliy')::boolean, false) AS milliy,
    code AS pack_code,
    expires_at
  FROM active;
$$;

-- 2) Bool helper for RLS
CREATE OR REPLACE FUNCTION public.user_has_section(_user_id uuid, _section text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions us
    JOIN public.subscription_packs sp ON sp.id = us.pack_id
    WHERE us.user_id = _user_id
      AND us.is_active = true
      AND us.expires_at > now()
      AND COALESCE((sp.features->'sections'->>_section)::boolean, false) = true
  );
$$;

-- 3) Map mock_kind to section name
CREATE OR REPLACE FUNCTION public.kind_to_section(_kind text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN _kind IN ('reading','listening','writing','speaking') THEN 'ielts'
    WHEN _kind = 'sat' THEN 'sat'
    WHEN _kind = 'national_cert' THEN 'milliy'
    ELSE NULL
  END;
$$;

-- 4) Tighten mock_tests SELECT to require section access (admins/PM bypass)
DROP POLICY IF EXISTS "members read mocks" ON public.mock_tests;
CREATE POLICY "members read mocks" ON public.mock_tests
FOR SELECT TO authenticated
USING (
  is_published = true
  AND ((organization_id IS NULL) OR (organization_id = current_user_org()))
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'payment_manager'::app_role)
    OR public.user_has_section(auth.uid(), public.kind_to_section(kind::text))
  )
);

-- 5) Restrict USER role messaging: user role can only message payment_managers
DROP POLICY IF EXISTS "users send messages" ON public.messages;
CREATE POLICY "users send messages" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND is_broadcast = false
  AND (
    NOT has_role(auth.uid(), 'user'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = messages.recipient_id
        AND ur.role = 'payment_manager'::app_role
    )
  )
);
