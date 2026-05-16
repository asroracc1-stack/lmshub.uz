-- Pricing plans table for landing page (separate from internal subscription_packs)
CREATE TABLE public.pricing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'UZS',
  price_suffix TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta_label TEXT NOT NULL DEFAULT 'Boshlash',
  cta_link TEXT NOT NULL DEFAULT '/auth',
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads active pricing plans"
ON public.pricing_plans FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admin manages pricing plans"
ON public.pricing_plans FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER pricing_plans_set_updated_at
BEFORE UPDATE ON public.pricing_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default plans
INSERT INTO public.pricing_plans (name, description, price_monthly, price_yearly, price_suffix, features, cta_label, is_popular, sort_order)
VALUES
  ('Starter', 'Boshlovchi talabalar uchun.', 0, 0, 'so''m', '["3 ta mock test / oy","Asosiy analitika","Community kirish"]'::jsonb, 'Bepul boshlash', false, 1),
  ('Pro', 'Jiddiy tayyorgarlik ko''ruvchilar uchun.', 149000, 1490000, 'so''m', '["Cheksiz mock testlar","AI Speaking & Writing","Premium analitika","Prioritet qo''llab-quvvatlash"]'::jsonb, 'Pro ga o''tish', true, 2),
  ('Tashkilot', 'O''quv markazlari uchun to''liq LMS.', 0, 0, NULL, '["Cheksiz foydalanuvchilar","Multi-tenant boshqaruv","Branding va domain","Dedicated manager"]'::jsonb, 'Bog''lanish', false, 3);