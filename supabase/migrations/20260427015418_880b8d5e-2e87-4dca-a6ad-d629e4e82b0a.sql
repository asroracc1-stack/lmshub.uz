
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_card_number text,
  ADD COLUMN IF NOT EXISTS payment_card_owner text,
  ADD COLUMN IF NOT EXISTS telegram_username text;

-- Helpful index for looking up an org's admin
CREATE INDEX IF NOT EXISTS idx_user_roles_org_role ON public.user_roles(organization_id, role);
