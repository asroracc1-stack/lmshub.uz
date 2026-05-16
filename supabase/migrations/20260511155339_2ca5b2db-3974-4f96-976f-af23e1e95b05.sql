
ALTER TYPE public.mock_kind ADD VALUE IF NOT EXISTS 'sat';
ALTER TYPE public.mock_kind ADD VALUE IF NOT EXISTS 'national_cert';

-- Allow payment_managers (pack-managers) to CRUD mock_tests
CREATE POLICY "payment_manager manages mocks"
ON public.mock_tests
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'payment_manager'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'payment_manager'::app_role));

CREATE POLICY "payment_manager manages questions"
ON public.mock_questions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'payment_manager'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'payment_manager'::app_role));

CREATE INDEX IF NOT EXISTS idx_mock_tests_required_pack ON public.mock_tests(required_pack);
CREATE INDEX IF NOT EXISTS idx_mock_tests_kind ON public.mock_tests(kind);
