CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _username text;
  _full_name text;
  _requested text;
  _role text;
  _org_id uuid;
  _is_service boolean;
BEGIN
  _username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', _username);
  _requested := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  _org_id := NULLIF(NEW.raw_user_meta_data->>'organization_id','')::uuid;

  _is_service := (current_setting('request.jwt.claim.role', true) = 'service_role')
              OR (auth.uid() IS NULL AND current_setting('request.jwt.claims', true) IS NULL);

  IF _is_service AND _requested IN ('super_admin','admin','administrator','teacher','parent','student','payment_manager') THEN
    _role := _requested;
  ELSE
    _role := 'student';
  END IF;

  INSERT INTO public.profiles (id, username, full_name, email, organization_id)
  VALUES (NEW.id, _username, _full_name, NEW.email, _org_id);

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (NEW.id, _role::app_role, _org_id);

  RETURN NEW;
END;
$function$;