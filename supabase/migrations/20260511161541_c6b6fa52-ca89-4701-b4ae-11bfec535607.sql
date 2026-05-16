
ALTER TABLE public.subscription_packs
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '{"ielts": false, "sat": false, "milliy": false}'::jsonb;

UPDATE public.subscription_packs SET sections = '{"ielts": false, "sat": false, "milliy": false}'::jsonb WHERE code = 'free';
UPDATE public.subscription_packs SET sections = '{"ielts": true,  "sat": false, "milliy": false}'::jsonb WHERE code = 'pro';
UPDATE public.subscription_packs SET sections = '{"ielts": true,  "sat": true,  "milliy": true }'::jsonb WHERE code = 'elite';

-- Cleanup the bad array element we appended earlier
UPDATE public.subscription_packs
SET features = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(features) elem
  WHERE jsonb_typeof(elem) <> 'object' OR NOT (elem ? 'sections')
)
WHERE jsonb_typeof(features) = 'array';

-- Update helpers to read from `sections` column
CREATE OR REPLACE FUNCTION public.user_section_access(_user_id uuid)
RETURNS TABLE(ielts boolean, sat boolean, milliy boolean, pack_code text, expires_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH active AS (
    SELECT sp.code, sp.sections, us.expires_at
    FROM public.user_subscriptions us
    JOIN public.subscription_packs sp ON sp.id = us.pack_id
    WHERE us.user_id = _user_id AND us.is_active = true AND us.expires_at > now()
    ORDER BY us.expires_at DESC LIMIT 1
  )
  SELECT
    COALESCE((sections->>'ielts')::boolean, false),
    COALESCE((sections->>'sat')::boolean, false),
    COALESCE((sections->>'milliy')::boolean, false),
    code, expires_at
  FROM active;
$$;

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
      AND COALESCE((sp.sections->>_section)::boolean, false) = true
  );
$$;
