-- Storage bucket for IELTS mock audio (Listening) and PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('mock-audio', 'mock-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for mock-audio bucket
DO $$ BEGIN
  CREATE POLICY "mock-audio public read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'mock-audio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "super_admin uploads mock-audio"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'mock-audio' AND public.has_role(auth.uid(), 'super_admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "super_admin updates mock-audio"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'mock-audio' AND public.has_role(auth.uid(), 'super_admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "super_admin deletes mock-audio"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'mock-audio' AND public.has_role(auth.uid(), 'super_admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add structured sections to mock_tests (sections: reading 3 passages / listening 4 sections)
ALTER TABLE public.mock_tests
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add expanded question types support (matching, T/F/NG, headings) — already free-form; ensure points default
ALTER TABLE public.mock_questions
  ADD COLUMN IF NOT EXISTS section_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS explanation text;

-- Per-question time analytics
ALTER TABLE public.mock_answers
  ADD COLUMN IF NOT EXISTS time_spent_ms integer NOT NULL DEFAULT 0;
