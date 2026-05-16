
-- ===== SUBSCRIPTION PACKS =====
CREATE TABLE IF NOT EXISTS public.subscription_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,            -- 'free' | 'pro' | 'elite'
  name text NOT NULL,
  price_uzs numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  mock_limit integer,                   -- null = unlimited
  speaking_minutes integer,             -- null = unlimited
  ai_grade_enabled boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read packs" ON public.subscription_packs FOR SELECT TO authenticated USING (is_active = true OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "super_admin manages packs" ON public.subscription_packs FOR ALL TO authenticated USING (has_role(auth.uid(),'super_admin')) WITH CHECK (has_role(auth.uid(),'super_admin'));

INSERT INTO public.subscription_packs (code, name, price_uzs, duration_days, features, mock_limit, speaking_minutes, ai_grade_enabled, sort_order)
VALUES
  ('free','Free',0,30,'["Asosiy mocklar","Davomat va baholar","Kunlik 1 ta mock"]'::jsonb,1,0,false,1),
  ('pro','Pro',99000,30,'["Cheksiz mocklar","AI Writing baholash","Peshqadamlar reytingi"]'::jsonb,NULL,30,true,2),
  ('elite','Elite',199000,30,'["Pro imkoniyatlari","AI Speaking Partner cheksiz","Premium qoʻllab-quvvatlash"]'::jsonb,NULL,NULL,true,3)
ON CONFLICT (code) DO NOTHING;

-- ===== USER SUBSCRIPTIONS =====
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_id uuid NOT NULL REFERENCES public.subscription_packs(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_subs_user ON public.user_subscriptions(user_id, expires_at DESC);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own subs" ON public.user_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "super_admin manages subs" ON public.user_subscriptions FOR ALL TO authenticated USING (has_role(auth.uid(),'super_admin')) WITH CHECK (has_role(auth.uid(),'super_admin'));
CREATE POLICY "org managers read org subs" ON public.user_subscriptions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_subscriptions.user_id AND p.organization_id IS NOT NULL AND is_org_manager(p.organization_id)));

CREATE OR REPLACE FUNCTION public.get_user_pack(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(
    (SELECT sp.code FROM public.user_subscriptions us
       JOIN public.subscription_packs sp ON sp.id = us.pack_id
      WHERE us.user_id = _user_id AND us.is_active = true AND us.expires_at > now()
      ORDER BY us.expires_at DESC LIMIT 1),
    'free'
  );
$$;

-- ===== IELTS MOCKS =====
DO $$ BEGIN CREATE TYPE mock_kind AS ENUM ('reading','listening','writing','speaking'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.mock_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  kind mock_kind NOT NULL,
  title text NOT NULL,
  description text,
  audio_url text,
  passage text,                     -- reading passage / writing prompt
  duration_minutes integer NOT NULL DEFAULT 60,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read mocks" ON public.mock_tests FOR SELECT TO authenticated
USING (is_published = true AND (organization_id IS NULL OR organization_id = current_user_org()));
CREATE POLICY "org managers manage mocks" ON public.mock_tests FOR ALL TO authenticated
USING (organization_id IS NOT NULL AND is_org_manager(organization_id))
WITH CHECK (organization_id IS NOT NULL AND is_org_manager(organization_id));
CREATE POLICY "super_admin manages mocks" ON public.mock_tests FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin')) WITH CHECK (has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.mock_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  prompt text NOT NULL,
  qtype text NOT NULL DEFAULT 'mcq',  -- mcq | fill | short
  options jsonb,                       -- ["A","B","C","D"]
  correct_answer text,
  points numeric NOT NULL DEFAULT 1
);
ALTER TABLE public.mock_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read questions" ON public.mock_questions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.mock_tests t WHERE t.id = test_id AND t.is_published = true AND (t.organization_id IS NULL OR t.organization_id = current_user_org())));
CREATE POLICY "managers manage questions" ON public.mock_questions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.mock_tests t WHERE t.id = test_id AND ((t.organization_id IS NOT NULL AND is_org_manager(t.organization_id)) OR has_role(auth.uid(),'super_admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.mock_tests t WHERE t.id = test_id AND ((t.organization_id IS NOT NULL AND is_org_manager(t.organization_id)) OR has_role(auth.uid(),'super_admin'))));

CREATE TABLE IF NOT EXISTS public.mock_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  organization_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  band_score numeric,
  raw_score numeric,
  max_score numeric,
  ai_feedback text,
  status text NOT NULL DEFAULT 'in_progress'  -- in_progress|graded
);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON public.mock_attempts(student_id, finished_at DESC);
ALTER TABLE public.mock_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student manages own attempts" ON public.mock_attempts FOR ALL TO authenticated
USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "org managers read attempts" ON public.mock_attempts FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND is_org_manager(organization_id));
CREATE POLICY "parents read child attempts" ON public.mock_attempts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.parent_student_links l WHERE l.parent_id = auth.uid() AND l.student_id = mock_attempts.student_id));
CREATE POLICY "teachers read attempts" ON public.mock_attempts FOR SELECT TO authenticated
USING (has_role(auth.uid(),'teacher') AND organization_id = current_user_org());

CREATE TABLE IF NOT EXISTS public.mock_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.mock_attempts(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.mock_questions(id) ON DELETE SET NULL,
  answer text,
  is_correct boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages answers" ON public.mock_answers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.mock_attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.mock_attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid()));
CREATE POLICY "managers read answers" ON public.mock_answers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.mock_attempts a WHERE a.id = attempt_id AND ((a.organization_id IS NOT NULL AND is_org_manager(a.organization_id)) OR has_role(auth.uid(),'super_admin'))));

-- ===== AI SPEAKING =====
CREATE TABLE IF NOT EXISTS public.speaking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  level text NOT NULL DEFAULT 'B1',     -- A1..C2
  topic text,
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.speaking_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own sessions" ON public.speaking_sessions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.speaking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.speaking_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,                   -- 'user' | 'assistant'
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.speaking_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages messages" ON public.speaking_messages FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.speaking_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.speaking_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE TRIGGER trg_speaking_sessions_updated BEFORE UPDATE ON public.speaking_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mock_tests_updated BEFORE UPDATE ON public.mock_tests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_packs_updated BEFORE UPDATE ON public.subscription_packs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
