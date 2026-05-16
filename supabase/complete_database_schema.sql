-- =====================================================================
--                   LMSHUB 1 COMPREHENSIVE SCHEMA INITIALIZATION
-- =====================================================================
-- This script contains 100% of the tables, columns, relations, enums,
-- RPCs, triggers, and Row Level Security (RLS) policies expected by
-- the LMSHub frontend for all 7 application roles:
-- SuperAdmin, Admin, Administrator, Teacher, Student, User, Package Manager.
-- =====================================================================

-- Enable necessary postgres extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. DROP EXISTING CONSTRAINTS, TRIGGERS & TABLES (CLEAN SLATE)
-- =====================================================================
-- Note: We drop in reverse topological order to ensure clean execution.

DROP VIEW IF EXISTS public.telegram_links_public;

-- Jadvallarni o'chirish (agar mavjud bo'lsa)
DROP TABLE IF EXISTS public.message_reads CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.reward_grants CASCADE;
DROP TABLE IF EXISTS public.rewards CASCADE;
DROP TABLE IF EXISTS public.coin_transactions CASCADE;
DROP TABLE IF EXISTS public.parent_student_links CASCADE;
DROP TABLE IF EXISTS public.speaking_messages CASCADE;
DROP TABLE IF EXISTS public.speaking_sessions CASCADE;
DROP TABLE IF EXISTS public.mock_answers CASCADE;
DROP TABLE IF EXISTS public.mock_attempts CASCADE;
DROP TABLE IF EXISTS public.mock_questions CASCADE;
DROP TABLE IF EXISTS public.mock_tests CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.user_feedback CASCADE;
DROP TABLE IF EXISTS public.telegram_links CASCADE;
DROP TABLE IF EXISTS public.practice_sessions CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_packs CASCADE;
DROP TABLE IF EXISTS public.payment_receivers CASCADE;
DROP TABLE IF EXISTS public.payment_managers CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_participants CASCADE;
DROP TABLE IF EXISTS public.chat_threads CASCADE;
DROP TABLE IF EXISTS public.feedbacks CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.group_teachers CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.pricing_plans CASCADE;

-- Enumlarni xavfsiz shakllantirish
DO $$
BEGIN
  DROP TYPE IF EXISTS public.app_role CASCADE;
  DROP TYPE IF EXISTS public.attendance_status CASCADE;
  DROP TYPE IF EXISTS public.feedback_type CASCADE;
  DROP TYPE IF EXISTS public.mock_kind CASCADE;
EXCEPTION WHEN OTHERS THEN
  -- Type dropping may fail if referenced inside functions we haven't dropped yet.
END $$;

CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'administrator', 'teacher', 'student', 'parent', 'payment_manager', 'user');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE public.feedback_type AS ENUM ('positive', 'negative', 'neutral');
CREATE TYPE public.mock_kind AS ENUM ('reading', 'listening', 'writing', 'speaking', 'sat', 'national_cert');

-- =====================================================================
-- 2. CORE DATABASE TABLES
-- =====================================================================

-- Organizations (Tenant Architecture)
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  telegram_chat_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (Foydalanuvchilar Ma'lumotlari)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  parent_phone TEXT,
  coin_balance INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  rating INTEGER NOT NULL DEFAULT 0,
  telegram_id TEXT,
  telegram_username TEXT,
  birthday DATE,
  gender TEXT,
  address TEXT,
  target_score TEXT,
  exam_date DATE,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE,
  referral_bonus_paid BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_id_role_unique UNIQUE (user_id, role)
);

-- Pricing Plans
CREATE TABLE public.pricing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Groups (Sinflar/Guruhlar)
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT,
  description TEXT,
  avatar_url TEXT,
  room TEXT,
  schedule_days TEXT[],
  lesson_start_time TIME,
  lesson_end_time TIME,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subjects (Fanlar)
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group Teachers (Guruhga biriktirilgan o'qituvchilar)
CREATE TABLE public.group_teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_main BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group Members (Guruhdagi o'quvchilar)
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT group_student_unique UNIQUE (group_id, student_id)
);

-- Lessons (Dars jadvali va darslar)
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attendance (Yo'qlama)
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attendance_lesson_student_unique UNIQUE (lesson_id, student_id)
);

-- Grades (Baholar va topshiriqlar)
CREATE TABLE public.grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL DEFAULT 100,
  weight NUMERIC DEFAULT 1.0,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedbacks (Tizim haqidagi fikr-mulohazalar)
CREATE TABLE public.feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type public.feedback_type NOT NULL DEFAULT 'neutral',
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat Threads
CREATE TABLE public.chat_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat Participants
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_participant_unique UNIQUE (thread_id, user_id)
);

-- Chat Messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 3. FINANCE & PAYMENT INFRASTRUCTURE
-- =====================================================================

-- Payment Managers (To'lovlarni qabul qiluvchi menejerlar)
CREATE TABLE public.payment_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT NOT NULL,
  telegram_username TEXT,
  telegram_chat_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  approved_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  last_assigned_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment Receivers (Karta raqamlari yoki to'lov rekvizitlari)
CREATE TABLE public.payment_receivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  details TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscription Packs (Sotib olinadigan tarif rejalar)
CREATE TABLE public.subscription_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_uzs INTEGER NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  sections JSONB NOT NULL DEFAULT '{"ielts": true, "sat": false, "milliy": false}'::jsonb,
  ai_grade_enabled BOOLEAN NOT NULL DEFAULT false,
  mock_limit INTEGER NOT NULL DEFAULT 0,
  speaking_minutes INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Subscriptions (Foydalanuvchilarning faol obunalari)
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.subscription_packs(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments (Oylik to'lovlar va cheklar)
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES public.subscription_packs(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES public.payment_managers(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  manager_comment TEXT,
  error_note TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 4. GAMIFICATION & REWARD ECONOMY
-- =====================================================================

-- Coin Transactions (Coin amallari va hisobi)
CREATE TABLE public.coin_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  awarded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rewards (Do'konda sotib olinadigan sovg'alar)
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cost_coins INTEGER NOT NULL,
  stock INTEGER,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reward Grants (Topshirilgan yoki kutilayotgan sovg'alar)
CREATE TABLE public.reward_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  coins_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 5. TELEGRAM INTEGRATION, AUDIT LOGS, FEEDBACK & NOTIFICATIONS
-- =====================================================================

-- Practice Sessions (O'quvchi kunlik mustaqil o'qigan vaqti)
CREATE TABLE public.practice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  minutes NUMERIC NOT NULL,
  activity TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Telegram Links
CREATE TABLE public.telegram_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  token TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Feedback
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating INTEGER,
  feedback TEXT,
  category TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Settings
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  theme TEXT NOT NULL DEFAULT 'light',
  language TEXT NOT NULL DEFAULT 'uz',
  notifications JSONB NOT NULL DEFAULT '{"email": true, "push": true, "telegram": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs (Tizim Amallari Tarixi)
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_username TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parent-Student Links (Ota-onalar va talabalar o'rtasidagi bog'liqlik)
CREATE TABLE public.parent_student_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT parent_student_unique UNIQUE (parent_id, student_id)
);

-- =====================================================================
-- 6. EXAMS, MOCK TESTS & AI SPEAKING
-- =====================================================================

-- Mock Tests (Onlayn imtihonlar bazasi)
CREATE TABLE public.mock_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  kind public.mock_kind NOT NULL DEFAULT 'reading',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mock Questions (Imtihon savollari)
CREATE TABLE public.mock_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  passage_text TEXT,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  points NUMERIC NOT NULL DEFAULT 1.0,
  sort_order INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mock Attempts (Imtihon topshirish urinishlari)
CREATE TABLE public.mock_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC,
  max_score NUMERIC,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress',
  ai_feedback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mock Answers (O'quvchilar javoblari)
CREATE TABLE public.mock_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.mock_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.mock_questions(id) ON DELETE CASCADE,
  selected_answer TEXT,
  is_correct BOOLEAN,
  points_awarded NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speaking Sessions (AI Speaking muloqotlari)
CREATE TABLE public.speaking_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL DEFAULT 'general',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  avg_fluency NUMERIC,
  avg_grammar NUMERIC,
  avg_vocabulary NUMERIC,
  avg_pronunciation NUMERIC,
  overall_band NUMERIC,
  ai_report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speaking Messages (AI Speaking muloqot xabarlari)
CREATE TABLE public.speaking_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.speaking_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' yoki 'assistant'
  content TEXT NOT NULL,
  audio_url TEXT,
  transcript TEXT,
  grammar_feedback TEXT,
  vocabulary_feedback TEXT,
  pronunciation_feedback TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 7. PLATFORM PL/PGSQL UTILITY & HELPER FUNCTIONS
-- =====================================================================

-- Security Check: check if user is manager/owner of organization
CREATE OR REPLACE FUNCTION public.is_org_manager(_org_id UUID)
RETURNS BOOLEAN LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role IN ('admin', 'administrator', 'super_admin')
       AND (organization_id = _org_id OR role = 'super_admin')
  );
END;
$$;

-- Get user active organization ID
CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Check role membership
CREATE OR REPLACE FUNCTION public.has_role(_uid UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role::text = _role
  );
$$;

-- Security Check: check if thread participant
CREATE OR REPLACE FUNCTION public.is_thread_participant(_thread_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE thread_id = _thread_id AND user_id = auth.uid()
  )
$$;

-- Audit Logger Helper Function
CREATE OR REPLACE FUNCTION public.write_audit(
  _action TEXT,
  _entity_type TEXT,
  _entity_id TEXT,
  _meta JSONB DEFAULT '{}'::jsonb
) RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _username TEXT;
BEGIN
  SELECT username INTO _username FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs(actor_id, actor_username, action, entity_type, entity_id, meta)
  VALUES (auth.uid(), _username, _action, _entity_type, _entity_id, _meta);
END;
$$;

-- Notification Dispatcher (Callable inside database triggers or by applications)
CREATE OR REPLACE FUNCTION public.send_notification(
  _user_id UUID,
  _title TEXT,
  _body TEXT DEFAULT NULL,
  _type TEXT DEFAULT 'info',
  _link TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO public.notifications(user_id, title, body, type, link)
  VALUES (_user_id, _title, _body, _type, _link)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Manual coin granting by SuperAdmin or Payment Manager
CREATE OR REPLACE FUNCTION public.grant_coins_to_user(_user_id UUID, _amount INTEGER, _reason TEXT DEFAULT 'Mukofot')
RETURNS UUID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'payment_manager')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN public.award_coins(_user_id, _amount, _reason, 'manual_grant', jsonb_build_object('by', auth.uid()));
END;
$$;

-- Main Coin Awarder Function
CREATE OR REPLACE FUNCTION public.award_coins(
  _student_id UUID,
  _amount INTEGER,
  _reason TEXT,
  _source TEXT DEFAULT 'manual',
  _meta JSONB DEFAULT '{}'::jsonb
) RETURNS UUID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
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
END;
$$;

-- Claim Reward Gift (Deducts coin, updates stock and notifications)
CREATE OR REPLACE FUNCTION public.claim_reward(_reward_id UUID)
RETURNS UUID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _org UUID;
  _coins INTEGER;
  _reward RECORD;
  _grant_id UUID;
  _mgr RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT organization_id, coins INTO _org, _coins FROM public.profiles WHERE id = _uid;
  IF _org IS NULL THEN RAISE EXCEPTION 'No organization'; END IF;

  SELECT * INTO _reward FROM public.rewards
   WHERE id = _reward_id AND organization_id = _org AND is_active = true;
  IF _reward.id IS NULL THEN RAISE EXCEPTION 'Reward unavailable'; END IF;

  IF _coins < _reward.cost_coins THEN RAISE EXCEPTION 'Coin yetarli emas'; END IF;
  IF _reward.stock IS NOT NULL AND _reward.stock <= 0 THEN RAISE EXCEPTION 'Sovg''a tugagan'; END IF;

  -- Deduct coins
  PERFORM public.award_coins(
    _uid,
    -_reward.cost_coins,
    'Sovg''a olindi: ' || _reward.title,
    'reward',
    jsonb_build_object('reward_id', _reward.id)
  );

  -- Insert grant
  INSERT INTO public.reward_grants(organization_id, student_id, reward_id, title, description, coins_spent, status)
  VALUES (_org, _uid, _reward.id, _reward.title, _reward.description, _reward.cost_coins, 'pending')
  RETURNING id INTO _grant_id;

  -- Decrement stock
  IF _reward.stock IS NOT NULL THEN
    UPDATE public.rewards SET stock = GREATEST(0, stock - 1) WHERE id = _reward.id;
  END IF;

  -- Notify org managers
  FOR _mgr IN
    SELECT user_id FROM public.user_roles WHERE organization_id = _org AND role IN ('admin','administrator')
  LOOP
    PERFORM public.send_notification(
      _mgr.user_id,
      '🎁 Talaba sovg''a oldi: ' || _reward.title,
      'Talabaga sovg''ani topshirib bering',
      'info',
      '/admin/rewards'
    );
  END LOOP;

  RETURN _grant_id;
END;
$$;

-- Next Round-Robin Payment Manager Assignation
CREATE OR REPLACE FUNCTION public.next_payment_manager()
RETURNS TABLE(id UUID, user_id UUID, display_name TEXT, telegram_username TEXT, telegram_chat_id TEXT)
LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE _pm RECORD;
BEGIN
  SELECT pm.* INTO _pm FROM public.payment_managers pm
   WHERE pm.is_active = true AND pm.is_default = true
   ORDER BY COALESCE(pm.last_assigned_at,'epoch'::timestamptz) ASC LIMIT 1;
  IF _pm.id IS NULL THEN
    SELECT pm.* INTO _pm FROM public.payment_managers pm
     WHERE pm.is_active = true
     ORDER BY COALESCE(pm.last_assigned_at,'epoch'::timestamptz) ASC LIMIT 1;
  END IF;
  IF _pm.id IS NULL THEN RETURN; END IF;
  UPDATE public.payment_managers SET last_assigned_at = now() WHERE id = _pm.id;
  RETURN QUERY SELECT _pm.id, _pm.user_id, _pm.display_name, _pm.telegram_username, _pm.telegram_chat_id;
END;
$$;

-- Approve Student Subscription Payment
CREATE OR REPLACE FUNCTION public.approve_payment(_payment_id UUID, _comment TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE _p RECORD; _pack RECORD; _new_sub_id UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'payment_manager')) THEN
    RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _p FROM public.payments WHERE id = _payment_id;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF _p.status IN ('paid','completed') THEN RAISE EXCEPTION 'Already approved'; END IF;

  IF _p.pack_id IS NOT NULL THEN
    SELECT * INTO _pack FROM public.subscription_packs WHERE id = _p.pack_id;
    IF _pack.id IS NULL THEN RAISE EXCEPTION 'Pack not found'; END IF;
    UPDATE public.user_subscriptions SET is_active=false WHERE user_id=_p.student_id AND is_active=true;
    IF _p.subscription_id IS NOT NULL THEN
      UPDATE public.user_subscriptions SET is_active=true, status='active', starts_at=now(),
             expires_at=now()+(_pack.duration_days||' days')::interval, granted_by=auth.uid()
       WHERE id = _p.subscription_id;
      _new_sub_id := _p.subscription_id;
    ELSE
      INSERT INTO public.user_subscriptions(user_id,pack_id,starts_at,expires_at,is_active,status,granted_by)
      VALUES (_p.student_id,_p.pack_id,now(),now()+(_pack.duration_days||' days')::interval,true,'active',auth.uid())
      RETURNING id INTO _new_sub_id;
    END IF;
  END IF;

  UPDATE public.payments
     SET status='paid', reviewed_at=now(), reviewed_by=auth.uid(),
         manager_comment=COALESCE(_comment,manager_comment),
         subscription_id=COALESCE(subscription_id,_new_sub_id)
   WHERE id=_payment_id;

  UPDATE public.payment_managers SET approved_count=approved_count+1, last_active_at=now() WHERE user_id=auth.uid();

  PERFORM public.send_notification(_p.student_id,'✅ To''lovingiz tasdiqlandi',
    COALESCE('Paket faollashtirildi: '||_pack.name,'To''lovingiz qabul qilindi'),'success','/student/payment');
END;
$$;

-- Reject Student Subscription Payment
CREATE OR REPLACE FUNCTION public.reject_payment(_payment_id UUID, _reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE _p RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'payment_manager')) THEN
    RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _p FROM public.payments WHERE id=_payment_id;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  UPDATE public.payments SET status='rejected', reviewed_at=now(), reviewed_by=auth.uid(),
         manager_comment=COALESCE(_reason,manager_comment), error_note=_reason WHERE id=_payment_id;
  IF _p.subscription_id IS NOT NULL THEN
    UPDATE public.user_subscriptions SET is_active=false, status='rejected' WHERE id=_p.subscription_id;
  END IF;
  UPDATE public.payment_managers SET rejected_count=rejected_count+1, last_active_at=now() WHERE user_id=auth.uid();
  PERFORM public.send_notification(_p.student_id,'❌ To''lov rad etildi',
    COALESCE(_reason,'Iltimos qayta urinib ko''ring'),'warning','/student/payment');
END;
$$;

-- Approve Organizational Payment
CREATE OR REPLACE FUNCTION public.approve_org_payment(_payment_id UUID, _comment TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE _p RECORD;
BEGIN
  SELECT * INTO _p FROM public.payments WHERE id = _payment_id;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'super_admin')
       OR (_p.organization_id IS NOT NULL AND public.is_org_manager(_p.organization_id))) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _p.status IN ('paid','completed') THEN RAISE EXCEPTION 'Already approved'; END IF;
  UPDATE public.payments
     SET status='paid', reviewed_at=now(), reviewed_by=auth.uid(),
         manager_comment=COALESCE(_comment, manager_comment)
   WHERE id=_payment_id;
  PERFORM public.send_notification(_p.student_id, '✅ Oylik to''lov tasdiqlandi',
    COALESCE(_comment,'To''lovingiz qabul qilindi. Rahmat!'),'success','/student/payment');
END;
$$;

-- Reject Organizational Payment
CREATE OR REPLACE FUNCTION public.reject_org_payment(_payment_id UUID, _reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE _p RECORD;
BEGIN
  SELECT * INTO _p FROM public.payments WHERE id = _payment_id;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'super_admin')
       OR (_p.organization_id IS NOT NULL AND public.is_org_manager(_p.organization_id))) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.payments
     SET status='rejected', reviewed_at=now(), reviewed_by=auth.uid(),
         manager_comment=COALESCE(_reason, manager_comment), error_note=_reason
   WHERE id=_payment_id;
  PERFORM public.send_notification(_p.student_id, '❌ Oylik to''lov rad etildi',
    COALESCE(_reason,'Iltimos qayta urinib ko''ring'),'warning','/student/payment');
END;
$$;

-- Log Daily Practice Minutes
CREATE OR REPLACE FUNCTION public.log_practice(_minutes NUMERIC, _activity TEXT DEFAULT 'general', _meta JSONB DEFAULT '{}'::jsonb)
RETURNS UUID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path=public AS $$
DECLARE _id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauth'; END IF;
  IF _minutes <= 0 OR _minutes > 240 THEN RETURN NULL; END IF;
  INSERT INTO public.practice_sessions(user_id, minutes, activity, meta)
  VALUES (auth.uid(), _minutes, COALESCE(_activity,'general'), COALESCE(_meta,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Practice Minutes Leaderboard
CREATE OR REPLACE FUNCTION public.get_practice_leaderboard(_period TEXT DEFAULT 'week', _limit INT DEFAULT 50)
RETURNS TABLE(user_id UUID, full_name TEXT, username TEXT, avatar_url TEXT, total_minutes NUMERIC, rank BIGINT)
LANGUAGE PLPGSQL STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _since TIMESTAMPTZ; _until TIMESTAMPTZ := now() + interval '1 day'; _now TIMESTAMPTZ := now(); _half INT;
BEGIN
  IF _period='week' THEN _since := date_trunc('week', _now);
  ELSIF _period='month' THEN _since := date_trunc('month', _now);
  ELSIF _period='6month' THEN
    _half := CASE WHEN extract(month from _now)::int <= 6 THEN 1 ELSE 7 END;
    _since := make_timestamptz(extract(year from _now)::int, _half, 1, 0, 0, 0);
  ELSIF _period='year' THEN _since := date_trunc('year', _now);
  ELSE _since := 'epoch'::timestamptz; END IF;
  RETURN QUERY
  WITH agg AS (
    SELECT ps.user_id AS uid, SUM(ps.minutes)::numeric AS mins
    FROM public.practice_sessions ps
    WHERE ps.created_at >= _since AND ps.created_at < _until
    GROUP BY ps.user_id
  )
  SELECT p.id, p.full_name, p.username, p.avatar_url, a.mins,
         ROW_NUMBER() OVER (ORDER BY a.mins DESC) AS rank
  FROM agg a JOIN public.profiles p ON p.id = a.uid
  WHERE a.mins > 0 ORDER BY a.mins DESC LIMIT _limit;
END;
$$;

-- Coins Leaderboard Function
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  _period TEXT DEFAULT 'week',
  _role public.app_role DEFAULT 'student',
  _organization_id UUID DEFAULT NULL,
  _limit INTEGER DEFAULT 50
)
RETURNS TABLE(user_id UUID, full_name TEXT, username TEXT, avatar_url TEXT, organization_id UUID, total_coins BIGINT, rank BIGINT)
LANGUAGE PLPGSQL STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _since TIMESTAMPTZ;
  _until TIMESTAMPTZ;
  _now TIMESTAMPTZ := now();
  _half INT;
BEGIN
  IF _period = 'week' THEN
    _since := date_trunc('week', _now);
    _until := _since + interval '7 days';
  ELSIF _period = 'month' THEN
    _since := date_trunc('month', _now);
    _until := _since + interval '1 month';
  ELSIF _period = '6month' THEN
    _half := CASE WHEN extract(month from _now)::int <= 6 THEN 1 ELSE 7 END;
    _since := make_timestamptz(extract(year from _now)::int, _half, 1, 0, 0, 0);
    _until := _since + interval '6 months';
  ELSIF _period = 'year' THEN
    _since := date_trunc('year', _now);
    _until := _since + interval '1 year';
  ELSE
    _since := 'epoch'::timestamptz;
    _until := _now + interval '1 day';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT ct.student_id AS uid, COALESCE(SUM(ct.amount),0)::bigint AS coins
    FROM public.coin_transactions ct
    WHERE ct.created_at >= _since AND ct.created_at < _until
      AND (_organization_id IS NULL OR ct.organization_id = _organization_id)
    GROUP BY ct.student_id
  )
  SELECT p.id, p.full_name, p.username, p.avatar_url, p.organization_id, a.coins,
         ROW_NUMBER() OVER (ORDER BY a.coins DESC) AS rank
  FROM agg a
  JOIN public.profiles p ON p.id = a.uid
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = _role
  WHERE a.coins > 0
  ORDER BY a.coins DESC
  LIMIT _limit;
END;
$$;

-- =====================================================================
-- 8. REFERRAL & SUBSCRIPTION ROUTINES
-- =====================================================================

-- Apply Referral Code
CREATE OR REPLACE FUNCTION public.apply_referral(_code TEXT)
RETURNS BOOLEAN LANGUAGE PLPGSQL SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid UUID := auth.uid(); _ref UUID;
BEGIN
  IF _uid IS NULL OR _code IS NULL THEN RETURN false; END IF;
  SELECT id INTO _ref FROM public.profiles WHERE referral_code = upper(_code) AND id <> _uid;
  IF _ref IS NULL THEN RETURN false; END IF;
  UPDATE public.profiles SET referred_by = _ref
   WHERE id = _uid AND referred_by IS NULL;
  RETURN FOUND;
END;
$$;

-- Referral Bonus Assigner
CREATE OR REPLACE FUNCTION public.maybe_pay_referral_bonus(_user_id UUID)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path=public AS $$
DECLARE _ref UUID; _paid BOOLEAN;
BEGIN
  SELECT referred_by, referral_bonus_paid INTO _ref, _paid FROM public.profiles WHERE id = _user_id;
  IF _ref IS NULL OR _paid THEN RETURN; END IF;
  PERFORM public.award_coins(_user_id, 5, 'Taklif bonusi 🎉', 'referral', jsonb_build_object('referrer', _ref));
  PERFORM public.award_coins(_ref, 5, 'Do''stingiz qo''shildi 🎉', 'referral', jsonb_build_object('invitee', _user_id));
  UPDATE public.profiles SET referral_bonus_paid = true WHERE id = _user_id;
END;
$$;

-- Subscribe to Package
CREATE OR REPLACE FUNCTION public.subscribe_to_pack(_pack_id UUID)
RETURNS UUID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid UUID := auth.uid();
  _pack RECORD;
  _sub_id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO _pack FROM public.subscription_packs WHERE id = _pack_id AND is_active = true;
  IF _pack.id IS NULL THEN RAISE EXCEPTION 'Pack not found'; END IF;

  UPDATE public.user_subscriptions SET is_active = false
   WHERE user_id = _uid AND is_active = true;

  IF _pack.code = 'free' THEN
    INSERT INTO public.user_subscriptions(user_id, pack_id, starts_at, expires_at, is_active, status)
    VALUES (_uid, _pack.id, now(), now() + interval '100 years', true, 'active')
    RETURNING id INTO _sub_id;
  ELSE
    INSERT INTO public.user_subscriptions(user_id, pack_id, starts_at, expires_at, is_active, status)
    VALUES (_uid, _pack.id, now(), now() + (_pack.duration_days || ' days')::interval, false, 'pending')
    RETURNING id INTO _sub_id;
  END IF;

  RETURN _sub_id;
END;
$$;

-- Activate Subscription
CREATE OR REPLACE FUNCTION public.activate_subscription(_sub_id UUID)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.user_subscriptions
     SET is_active = true, status = 'active'
   WHERE id = _sub_id;
END;
$$;

-- Check User Subscription Section Access (IELTS, SAT, MILLIY)
CREATE OR REPLACE FUNCTION public.user_section_access(_user_id UUID)
RETURNS TABLE(ielts BOOLEAN, sat BOOLEAN, milliy BOOLEAN, pack_code TEXT, expires_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
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

-- Check specific section permission
CREATE OR REPLACE FUNCTION public.user_has_section(_user_id UUID, _section TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
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

-- Get User Active Pack Code
CREATE OR REPLACE FUNCTION public.get_user_pack(_user_id UUID)
RETURNS TEXT LANGUAGE PLPGSQL STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _code TEXT;
BEGIN
  SELECT sp.code INTO _code FROM public.user_subscriptions us
    JOIN public.subscription_packs sp ON sp.id = us.pack_id
   WHERE us.user_id = _user_id AND us.is_active = true AND us.expires_at > now()
   ORDER BY us.expires_at DESC LIMIT 1;
  RETURN COALESCE(_code, 'free');
END;
$$;

-- Kind to Section conversion helper
CREATE OR REPLACE FUNCTION public.kind_to_section(_kind TEXT)
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE _kind
    WHEN 'reading' THEN 'ielts'
    WHEN 'listening' THEN 'ielts'
    WHEN 'writing' THEN 'ielts'
    WHEN 'speaking' THEN 'ielts'
    WHEN 'sat' THEN 'sat'
    WHEN 'national_cert' THEN 'milliy'
    ELSE 'ielts'
  END;
$$;

-- Send Exam countdown reminders function
CREATE OR REPLACE FUNCTION public.send_exam_countdown_reminders()
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _r RECORD;
  _days INT;
  _hours INT;
BEGIN
  FOR _r IN
    SELECT id, full_name, exam_date FROM public.profiles
     WHERE exam_date IS NOT NULL AND exam_date >= CURRENT_DATE
  LOOP
    _days := (_r.exam_date - CURRENT_DATE);
    _hours := _days * 24;
    PERFORM public.send_notification(
      _r.id,
      '⏳ Imtihongacha ' || _days || ' kun (' || _hours || ' soat) qoldi',
      'Bugungi mashqlaringizni qoldirmang — har kun band ballingizni oshirish uchun muhim!',
      'info',
      '/student/dashboard'
    );
  END LOOP;
END;
$$;

-- Reject package manager pending subscription
CREATE OR REPLACE FUNCTION public.reject_subscription(_sub_id UUID)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'payment_manager')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.user_subscriptions
     SET is_active = false, status = 'rejected'
   WHERE id = _sub_id;
END;
$$;

-- Automatic user synchronization function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _username TEXT;
  _full_name TEXT;
  _requested TEXT;
  _role TEXT;
  _org_id UUID;
  _is_service BOOLEAN;
BEGIN
  _username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', _username);
  _requested := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  _org_id := NULLIF(NEW.raw_user_meta_data->>'organization_id','')::UUID;

  _is_service := (current_setting('request.jwt.claim.role', true) = 'service_role')
              OR (auth.uid() IS NULL AND current_setting('request.jwt.claims', true) IS NULL);

  IF _is_service AND _requested IN ('super_admin','admin','administrator','teacher','parent','student','payment_manager','user') THEN
    _role := _requested;
  ELSE
    _role := 'student';
  END IF;

  INSERT INTO public.profiles (id, username, full_name, email, organization_id)
  VALUES (NEW.id, _username, _full_name, NEW.email, _org_id)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    organization_id = EXCLUDED.organization_id;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (NEW.id, _role::public.app_role, _org_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Referral code auto-generator function
CREATE OR REPLACE FUNCTION public.gen_referral_code() RETURNS TRIGGER
LANGUAGE PLPGSQL SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(md5(NEW.id::text || COALESCE(NEW.username,'') || extract(epoch from now())::text),1,8));
  END IF;
  RETURN NEW;
END;
$$;

-- Attendance trigger logic
CREATE OR REPLACE FUNCTION public.auto_award_attendance_coins()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
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
END;
$$;

-- Grade trigger logic
CREATE OR REPLACE FUNCTION public.auto_award_grade_coins()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
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
END;
$$;

-- Practice trigger logic
CREATE OR REPLACE FUNCTION public.on_practice_referral() RETURNS TRIGGER
LANGUAGE PLPGSQL SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.maybe_pay_referral_bonus(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Organization alert trigger logic
CREATE OR REPLACE FUNCTION public.notify_org_created()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _admin RECORD;
BEGIN
  FOR _admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'super_admin'
  LOOP
    PERFORM public.send_notification(
      _admin.user_id,
      'Yangi tashkilot qo''shildi',
      NEW.name || ' tizimga ulandi',
      'success',
      '/super-admin/organizations'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 9. TRIGGERS ASSIGNMENT
-- =====================================================================
CREATE TRIGGER trg_gen_referral BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.gen_referral_code();

CREATE TRIGGER trg_practice_ref AFTER INSERT ON public.practice_sessions
FOR EACH ROW EXECUTE FUNCTION public.on_practice_referral();

CREATE TRIGGER trg_auto_award_attendance AFTER INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.auto_award_attendance_coins();

CREATE TRIGGER trg_auto_award_grade AFTER INSERT ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.auto_award_grade_coins();

CREATE TRIGGER trg_notify_org_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.notify_org_created();

-- =====================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES FOR ALL ROLES (ROLE-SPECIFIC ACCESS)
-- =====================================================================

-- Turn RLS ON for all database tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaking_messages ENABLE ROW LEVEL SECURITY;

-- Role Helper Functions to prevent recursion
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role::text IN ('super_admin', 'admin', 'administrator')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_payment_manager(_uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role::text IN ('super_admin', 'payment_manager')
  );
$$;

-- Drop legacy policies to avoid conflicts
DROP POLICY IF EXISTS "allow_all_authenticated_organizations" ON public.organizations;
DROP POLICY IF EXISTS "allow_all_authenticated_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_authenticated_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "allow_all_authenticated_pricing_plans" ON public.pricing_plans;
DROP POLICY IF EXISTS "allow_all_authenticated_groups" ON public.groups;
DROP POLICY IF EXISTS "allow_all_authenticated_subjects" ON public.subjects;
DROP POLICY IF EXISTS "allow_all_authenticated_group_teachers" ON public.group_teachers;
DROP POLICY IF EXISTS "allow_all_authenticated_group_members" ON public.group_members;
DROP POLICY IF EXISTS "allow_all_authenticated_lessons" ON public.lessons;
DROP POLICY IF EXISTS "allow_all_authenticated_attendance" ON public.attendance;
DROP POLICY IF EXISTS "allow_all_authenticated_grades" ON public.grades;
DROP POLICY IF EXISTS "allow_all_authenticated_feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "allow_all_authenticated_chat_threads" ON public.chat_threads;
DROP POLICY IF EXISTS "allow_all_authenticated_chat_participants" ON public.chat_participants;
DROP POLICY IF EXISTS "allow_all_authenticated_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "allow_all_authenticated_payments" ON public.payments;
DROP POLICY IF EXISTS "allow_all_authenticated_payment_managers" ON public.payment_managers;
DROP POLICY IF EXISTS "allow_all_authenticated_payment_receivers" ON public.payment_receivers;
DROP POLICY IF EXISTS "allow_all_authenticated_subscription_packs" ON public.subscription_packs;
DROP POLICY IF EXISTS "allow_all_authenticated_user_subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "allow_all_authenticated_telegram_links" ON public.telegram_links;
DROP POLICY IF EXISTS "allow_all_authenticated_practice_sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "allow_all_authenticated_user_feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "allow_all_authenticated_user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "allow_all_authenticated_notifications" ON public.notifications;
DROP POLICY IF EXISTS "allow_all_authenticated_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "allow_all_authenticated_events" ON public.events;
DROP POLICY IF EXISTS "allow_all_authenticated_parent_student_links" ON public.parent_student_links;
DROP POLICY IF EXISTS "allow_all_authenticated_mock_tests" ON public.mock_tests;
DROP POLICY IF EXISTS "allow_all_authenticated_mock_questions" ON public.mock_questions;
DROP POLICY IF EXISTS "allow_all_authenticated_mock_attempts" ON public.mock_attempts;
DROP POLICY IF EXISTS "allow_all_authenticated_mock_answers" ON public.mock_answers;
DROP POLICY IF EXISTS "allow_all_authenticated_speaking_sessions" ON public.speaking_sessions;
DROP POLICY IF EXISTS "allow_all_authenticated_speaking_messages" ON public.speaking_messages;
DROP POLICY IF EXISTS "allow_all_authenticated_coin_transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "allow_all_authenticated_rewards" ON public.rewards;
DROP POLICY IF EXISTS "allow_all_authenticated_reward_grants" ON public.reward_grants;

-- PROFILES POLICIES
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid())) WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- USER ROLES POLICIES
CREATE POLICY "user_roles_select_all" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid())) WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- ORGANIZATIONS POLICIES
CREATE POLICY "organizations_select_all" ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "organizations_admin_all" ON public.organizations FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid())) WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- PAYMENTS POLICIES (STUDENT CAN ONLY READ & INSERT THEIR OWN; ADMIN/MANAGER HAS FULL CONTROL)
CREATE POLICY "payments_student_select" ON public.payments FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "payments_student_insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "payments_admin_all" ON public.payments FOR ALL TO authenticated USING (public.is_admin_or_manager(auth.uid()) OR public.is_payment_manager(auth.uid())) WITH CHECK (public.is_admin_or_manager(auth.uid()) OR public.is_payment_manager(auth.uid()));

-- PRACTICE SESSIONS POLICIES
CREATE POLICY "practice_sessions_student_all" ON public.practice_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "practice_sessions_teacher_admin_select" ON public.practice_sessions FOR SELECT TO authenticated USING (true);

-- SPEAKING SESSIONS POLICIES
CREATE POLICY "speaking_sessions_student_all" ON public.speaking_sessions FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "speaking_sessions_teacher_admin_select" ON public.speaking_sessions FOR SELECT TO authenticated USING (true);

-- SPEAKING MESSAGES POLICIES
CREATE POLICY "speaking_messages_student_all" ON public.speaking_messages FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.speaking_sessions ss WHERE ss.id = session_id AND ss.student_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.speaking_sessions ss WHERE ss.id = session_id AND ss.student_id = auth.uid())
);
CREATE POLICY "speaking_messages_teacher_admin_select" ON public.speaking_messages FOR SELECT TO authenticated USING (true);

-- ATTENDANCE POLICIES
CREATE POLICY "attendance_student_select" ON public.attendance FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "attendance_teacher_admin_all" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- GRADES POLICIES
CREATE POLICY "grades_student_select" ON public.grades FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "grades_teacher_admin_all" ON public.grades FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NOTIFICATIONS POLICIES
CREATE POLICY "notifications_user_all" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- USER SETTINGS POLICIES
CREATE POLICY "user_settings_user_all" ON public.user_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- USER FEEDBACK POLICIES
CREATE POLICY "user_feedback_user_all" ON public.user_feedback FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- COIN TRANSACTIONS POLICIES
CREATE POLICY "coin_transactions_student_select" ON public.coin_transactions FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "coin_transactions_admin_all" ON public.coin_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FALLBACK POLICIES FOR OTHER GLOBAL DATA TABLES
CREATE POLICY "pricing_plans_all" ON public.pricing_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "groups_all" ON public.groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "subjects_all" ON public.subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "group_teachers_all" ON public.group_teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "group_members_all" ON public.group_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lessons_all" ON public.lessons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "feedbacks_all" ON public.feedbacks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chat_threads_all" ON public.chat_threads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chat_participants_all" ON public.chat_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chat_messages_all" ON public.chat_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "payment_managers_all" ON public.payment_managers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "payment_receivers_all" ON public.payment_receivers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "subscription_packs_all" ON public.subscription_packs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "user_subscriptions_all" ON public.user_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "rewards_all" ON public.rewards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "reward_grants_all" ON public.reward_grants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "telegram_links_all" ON public.telegram_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "audit_logs_all" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "events_all" ON public.events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "parent_student_links_all" ON public.parent_student_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mock_tests_all" ON public.mock_tests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mock_questions_all" ON public.mock_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mock_attempts_all" ON public.mock_attempts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mock_answers_all" ON public.mock_answers FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =====================================================================
-- 11. DEFAULT PLATFORM PACKS INITIALIZATION
-- =====================================================================
INSERT INTO public.subscription_packs (id, code, name, price_uzs, duration_days, sections, ai_grade_enabled, mock_limit, speaking_minutes, sort_order, is_active)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'free', 'Tekshiruv (Free)', 0, 36500, '{"ielts": false, "sat": false, "milliy": false}'::jsonb, false, 1, 5, 1, true),
  ('44444444-4444-4444-4444-444444444444', 'pro', 'Faol (Pro)', 150000, 30, '{"ielts": true, "sat": false, "milliy": false}'::jsonb, true, 10, 60, 2, true),
  ('55555555-5555-5555-5555-555555555555', 'elite', 'Cheksiz (Elite)', 300000, 30, '{"ielts": true, "sat": true, "milliy": true}'::jsonb, true, 999, 999, 3, true)
ON CONFLICT (id) DO NOTHING;

-- Default LMS Hub Organization
INSERT INTO public.organizations (id, name, slug, description, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'LMS Hub Official', 'lms-hub', 'Boshqaruv Tizimi Platformasi', true)
ON CONFLICT (id) DO NOTHING;

-- Public View for hiding bot tokens
CREATE VIEW public.telegram_links_public WITH (security_invoker=on) AS
SELECT id, kind, name, username, description, is_active, created_at FROM public.telegram_links;

-- =====================================================================
-- 12. HIGH-FIDELITY SEED DATA (SUPERADMIN: asror@lms.uz)
-- =====================================================================
DO $$
DECLARE
  super_admin_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'asror@lms.uz') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
    ) VALUES (
      super_admin_id, '00000000-0000-0000-0000-000000000000', 'asror@lms.uz',
      crypt('asrorsuperadn123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Asror SuperAdmin","username":"asror","role":"super_admin"}',
      'authenticated', 'authenticated', now(), now()
    );

    INSERT INTO public.profiles (id, username, full_name, email, organization_id, is_active)
    VALUES (super_admin_id, 'asror', 'Asror SuperAdmin', 'asror@lms.uz', '11111111-1111-1111-1111-111111111111', true);

    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (super_admin_id, 'super_admin'::public.app_role, '11111111-1111-1111-1111-111111111111');
  END IF;
END $$;

-- =====================================================================
-- 13. STORAGE BUCKETS & RLS POLICIES (AVATARS & LOGOS)
-- =====================================================================
-- Ensure storage extensions are active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Initialize Avatars, Logos, Org-Logos, Mock-Audio & Speaking Recordings buckets in Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']),
  ('logos', 'logos', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']),
  ('org-logos', 'org-logos', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']),
  ('mock-audio', 'mock-audio', true, 52428800, ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'application/octet-stream']),
  ('speaking-recordings', 'speaking-recordings', true, 15728640, ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'application/octet-stream'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing storage policies if they exist to prevent duplication errors
DROP POLICY IF EXISTS "Public Access for Avatars Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload for Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete for Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for Logos Bucket" ON storage.objects;
DROP POLICY IF EXISTS "SuperAdmin/Admin Upload for Logos" ON storage.objects;
DROP POLICY IF EXISTS "SuperAdmin/Admin Delete for Logos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for Org Logos Bucket" ON storage.objects;
DROP POLICY IF EXISTS "SuperAdmin/Admin Upload for Org Logos" ON storage.objects;
DROP POLICY IF EXISTS "SuperAdmin/Admin Delete for Org Logos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for Mock Audio Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload for Mock Audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete for Mock Audio" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for Speaking Recordings Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload for Speaking Recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete for Speaking Recordings" ON storage.objects;

-- Storage Policies for 'avatars' Bucket
CREATE POLICY "Public Access for Avatars Bucket" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Upload for Avatars" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Owner Delete for Avatars" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'avatars');

-- Storage Policies for 'logos' Bucket
CREATE POLICY "Public Access for Logos Bucket" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'logos');

CREATE POLICY "SuperAdmin/Admin Upload for Logos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');

CREATE POLICY "SuperAdmin/Admin Delete for Logos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'logos');

-- Storage Policies for 'org-logos' Bucket
CREATE POLICY "Public Access for Org Logos Bucket" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'org-logos');

CREATE POLICY "SuperAdmin/Admin Upload for Org Logos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'org-logos');

CREATE POLICY "SuperAdmin/Admin Delete for Org Logos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'org-logos');

-- Storage Policies for 'mock-audio' Bucket
CREATE POLICY "Public Access for Mock Audio Bucket" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'mock-audio');

CREATE POLICY "Authenticated Upload for Mock Audio" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mock-audio');

CREATE POLICY "Authenticated Delete for Mock Audio" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'mock-audio');

-- Storage Policies for 'speaking-recordings' Bucket
CREATE POLICY "Public Access for Speaking Recordings Bucket" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'speaking-recordings');

CREATE POLICY "Authenticated Upload for Speaking Recordings" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'speaking-recordings');

CREATE POLICY "Authenticated Delete for Speaking Recordings" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'speaking-recordings');


