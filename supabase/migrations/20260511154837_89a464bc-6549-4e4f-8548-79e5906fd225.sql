-- Allow authenticated users to see active payment managers (for chat partners list)
CREATE POLICY "auth users read active payment_managers"
ON public.payment_managers
FOR SELECT
TO authenticated
USING (is_active = true);

-- Allow authenticated users to read profiles of payment managers (for chat header/avatar)
CREATE POLICY "auth users read pm profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id
      AND ur.role = 'payment_manager'::app_role
  )
);