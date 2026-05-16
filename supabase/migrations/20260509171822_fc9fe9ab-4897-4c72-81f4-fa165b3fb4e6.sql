-- Production-grade indexes for high-traffic queries (1000+ concurrent users)

-- Notifications: per-user feed sorted by time
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

-- Payments: filtered by status, by student, by org, by receiver
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON public.payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_student_created ON public.payments(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_org_created ON public.payments(organization_id, created_at DESC) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_receiver ON public.payments(receiver_id) WHERE receiver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_recipient ON public.payments(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_pack ON public.payments(pack_id) WHERE pack_id IS NOT NULL;

-- Coin transactions: leaderboard aggregation + per-student history
CREATE INDEX IF NOT EXISTS idx_coin_tx_student_created ON public.coin_transactions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_tx_org_created ON public.coin_transactions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_tx_created ON public.coin_transactions(created_at DESC);

-- Lessons: schedule queries by group/time
CREATE INDEX IF NOT EXISTS idx_lessons_group_starts ON public.lessons(group_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_starts ON public.lessons(teacher_id, starts_at DESC) WHERE teacher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_org_starts ON public.lessons(organization_id, starts_at DESC);

-- Attendance: per-lesson and per-student lookups
CREATE INDEX IF NOT EXISTS idx_attendance_lesson ON public.attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_created ON public.attendance(student_id, created_at DESC);

-- Grades: student dashboard
CREATE INDEX IF NOT EXISTS idx_grades_student_created ON public.grades(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grades_teacher_created ON public.grades(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON public.grades(subject_id);

-- Group memberships
CREATE INDEX IF NOT EXISTS idx_group_members_student ON public.group_members(student_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_teachers_teacher ON public.group_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_group_teachers_group ON public.group_teachers(group_id);

-- Profiles: org-scoped lookups
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- User roles: critical for has_role() checks
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_user_roles_org_role ON public.user_roles(organization_id, role) WHERE organization_id IS NOT NULL;

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subs_user_active ON public.user_subscriptions(user_id, is_active, expires_at DESC);

-- Mock tests / attempts
CREATE INDEX IF NOT EXISTS idx_mock_tests_kind_published ON public.mock_tests(kind, is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_mock_attempts_student_started ON public.mock_attempts(student_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_attempts_test ON public.mock_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_mock_questions_test_pos ON public.mock_questions(test_id, position);
CREATE INDEX IF NOT EXISTS idx_mock_answers_attempt ON public.mock_answers(attempt_id);

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON public.chat_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_thread ON public.chat_participants(thread_id);

-- Messages (broadcasts/DM)
CREATE INDEX IF NOT EXISTS idx_messages_recipient_created ON public.messages(recipient_id, created_at DESC) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_org_broadcast ON public.messages(organization_id, created_at DESC) WHERE is_broadcast = true;

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC) WHERE actor_id IS NOT NULL;

-- Events (calendar)
CREATE INDEX IF NOT EXISTS idx_events_org_starts ON public.events(organization_id, starts_at DESC) WHERE organization_id IS NOT NULL;

-- Reward grants
CREATE INDEX IF NOT EXISTS idx_reward_grants_student_created ON public.reward_grants(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_grants_org_status ON public.reward_grants(organization_id, status);

-- Feedbacks
CREATE INDEX IF NOT EXISTS idx_feedbacks_student_created ON public.feedbacks(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_teacher_created ON public.feedbacks(teacher_id, created_at DESC);

-- Payment receivers (active filter)
CREATE INDEX IF NOT EXISTS idx_payment_receivers_active ON public.payment_receivers(organization_id, is_active) WHERE is_active = true;

-- Parent-student links
CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_student ON public.parent_student_links(student_id);

-- ANALYZE to refresh query planner statistics
ANALYZE public.notifications;
ANALYZE public.payments;
ANALYZE public.coin_transactions;
ANALYZE public.lessons;
ANALYZE public.attendance;
ANALYZE public.grades;
ANALYZE public.user_roles;
ANALYZE public.profiles;
ANALYZE public.mock_attempts;
ANALYZE public.chat_messages;