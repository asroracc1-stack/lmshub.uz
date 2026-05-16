
CREATE POLICY "auth users read pack manager roles"
ON public.user_roles FOR SELECT TO authenticated
USING (role = 'payment_manager'::app_role);
