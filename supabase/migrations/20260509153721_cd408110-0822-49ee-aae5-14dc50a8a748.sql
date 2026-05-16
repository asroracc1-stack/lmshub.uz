
-- Add FK relationships so PostgREST can do nested selects between user_subscriptions/payments and profiles
ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_student_id_profiles_fkey
  FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_pack_id ON public.user_subscriptions(pack_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_pack_id ON public.payments(pack_id);

NOTIFY pgrst, 'reload schema';
