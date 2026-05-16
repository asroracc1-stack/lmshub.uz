ALTER TABLE public.mock_tests
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'easy',
  ADD COLUMN IF NOT EXISTS part_type text NOT NULL DEFAULT '1',
  ADD COLUMN IF NOT EXISTS required_pack text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';