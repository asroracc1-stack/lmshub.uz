
-- 1) Add parent role to enum (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'parent' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'parent';
  END IF;
END $$;

-- 2) parent <-> student links
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL,
  student_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  relation TEXT NOT NULL DEFAULT 'parent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents see own links"
  ON public.parent_student_links FOR SELECT
  USING (parent_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY "Org managers see org links"
  ON public.parent_student_links FOR SELECT
  USING (public.is_org_manager(organization_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Org managers manage links"
  ON public.parent_student_links FOR ALL
  USING (public.is_org_manager(organization_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_org_manager(organization_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_psl_parent ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student ON public.parent_student_links(student_id);

-- 3) Leaderboard function (period: week|month|6month|year)
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  _period TEXT DEFAULT 'week',
  _role app_role DEFAULT 'student',
  _organization_id UUID DEFAULT NULL,
  _limit INT DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  organization_id UUID,
  total_coins BIGINT,
  rank BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since TIMESTAMPTZ;
BEGIN
  _since := CASE _period
    WHEN 'week' THEN now() - interval '7 days'
    WHEN 'month' THEN now() - interval '30 days'
    WHEN '6month' THEN now() - interval '180 days'
    WHEN 'year' THEN now() - interval '365 days'
    ELSE now() - interval '7 days'
  END;

  RETURN QUERY
  WITH agg AS (
    SELECT
      ct.student_id AS uid,
      COALESCE(SUM(ct.amount), 0)::BIGINT AS coins
    FROM public.coin_transactions ct
    WHERE ct.created_at >= _since
      AND (_organization_id IS NULL OR ct.organization_id = _organization_id)
    GROUP BY ct.student_id
  )
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.organization_id,
    a.coins,
    ROW_NUMBER() OVER (ORDER BY a.coins DESC) AS rank
  FROM agg a
  JOIN public.profiles p ON p.id = a.uid
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = _role
  WHERE a.coins > 0
  ORDER BY a.coins DESC
  LIMIT _limit;
END;
$$;
