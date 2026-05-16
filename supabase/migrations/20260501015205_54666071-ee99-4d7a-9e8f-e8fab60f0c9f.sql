-- Add coin balance to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

-- Add recipient_role to payments to track which card was paid to
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS recipient_role TEXT;

-- Coin transactions table (history)
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  awarded_by UUID,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students read own coins" ON public.coin_transactions
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "org managers manage coins" ON public.coin_transactions
  FOR ALL TO authenticated USING (is_org_manager(organization_id)) WITH CHECK (is_org_manager(organization_id));
CREATE POLICY "super_admin manages coins" ON public.coin_transactions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Rewards / gifts catalog
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cost_coins INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '🎁',
  is_active BOOLEAN NOT NULL DEFAULT true,
  stock INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read rewards" ON public.rewards
  FOR SELECT TO authenticated USING (organization_id = current_user_org());
CREATE POLICY "org managers manage rewards" ON public.rewards
  FOR ALL TO authenticated USING (is_org_manager(organization_id)) WITH CHECK (is_org_manager(organization_id));

CREATE TRIGGER trg_rewards_updated_at BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reward redemptions / gifts given to students
CREATE TABLE IF NOT EXISTS public.reward_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  student_id UUID NOT NULL,
  reward_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  coins_spent INTEGER NOT NULL DEFAULT 0,
  granted_by UUID,
  status TEXT NOT NULL DEFAULT 'granted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students read own grants" ON public.reward_grants
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "org managers manage grants" ON public.reward_grants
  FOR ALL TO authenticated USING (is_org_manager(organization_id)) WITH CHECK (is_org_manager(organization_id));

-- Function: award coins (updates balance + writes transaction + notifies)
CREATE OR REPLACE FUNCTION public.award_coins(
  _student_id UUID,
  _amount INTEGER,
  _reason TEXT,
  _source TEXT DEFAULT 'manual',
  _meta JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org_id UUID;
  _tx_id UUID;
BEGIN
  SELECT organization_id INTO _org_id FROM public.profiles WHERE id = _student_id;
  IF _org_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.profiles SET coins = GREATEST(0, coins + _amount) WHERE id = _student_id;

  INSERT INTO public.coin_transactions(student_id, organization_id, amount, reason, source, awarded_by, meta)
  VALUES (_student_id, _org_id, _amount, _reason, _source, auth.uid(), _meta)
  RETURNING id INTO _tx_id;

  PERFORM public.send_notification(
    _student_id,
    CASE WHEN _amount >= 0 THEN '🪙 +' || _amount || ' coin qo''lga kiritdingiz!' ELSE '🪙 ' || _amount || ' coin' END,
    _reason,
    CASE WHEN _amount >= 0 THEN 'success' ELSE 'warning' END,
    '/student/rewards'
  );
  RETURN _tx_id;
END; $$;

-- Trigger: auto-award coins on attendance (present=+5, late=+1, absent=-3, excused=0)
CREATE OR REPLACE FUNCTION public.auto_award_attendance_coins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _amt INTEGER;
  _reason TEXT;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    CASE NEW.status::text
      WHEN 'present' THEN _amt := 5; _reason := 'Darsga vaqtida keldingiz ✅';
      WHEN 'late'    THEN _amt := 1; _reason := 'Darsga kech keldingiz ⏰';
      WHEN 'absent'  THEN _amt := -3; _reason := 'Darsda yo''q edingiz ❌';
      ELSE _amt := 0; _reason := '';
    END CASE;
    IF _amt <> 0 THEN
      PERFORM public.award_coins(NEW.student_id, _amt, _reason, 'attendance', jsonb_build_object('lesson_id', NEW.lesson_id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_award_attendance ON public.attendance;
CREATE TRIGGER trg_auto_award_attendance AFTER INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.auto_award_attendance_coins();

-- Trigger: auto-award coins on grades (>= 90% => +10, 75-89 => +5, 60-74 => +2)
CREATE OR REPLACE FUNCTION public.auto_award_grade_coins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pct NUMERIC; _amt INTEGER; _reason TEXT;
BEGIN
  IF NEW.max_score > 0 THEN
    _pct := (NEW.score / NEW.max_score) * 100;
    IF _pct >= 90 THEN _amt := 10; _reason := 'A''lo baho! 🌟 (' || ROUND(_pct) || '%)';
    ELSIF _pct >= 75 THEN _amt := 5; _reason := 'Yaxshi baho 👍 (' || ROUND(_pct) || '%)';
    ELSIF _pct >= 60 THEN _amt := 2; _reason := 'Qoniqarli baho (' || ROUND(_pct) || '%)';
    ELSE _amt := 0;
    END IF;
    IF _amt > 0 THEN
      PERFORM public.award_coins(NEW.student_id, _amt, _reason, 'grade', jsonb_build_object('grade_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_award_grade ON public.grades;
CREATE TRIGGER trg_auto_award_grade AFTER INSERT ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.auto_award_grade_coins();

-- Settings table (per-user app settings)
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'dark',
  language TEXT NOT NULL DEFAULT 'uz',
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  telegram_notifications BOOLEAN NOT NULL DEFAULT true,
  compact_mode BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own settings" ON public.user_settings
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();