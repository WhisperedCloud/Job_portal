CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DECLARE
    extracted_name TEXT := SPLIT_PART(NEW.email, '@', 1);
    user_role TEXT;
  BEGIN
    user_role := NEW.raw_user_meta_data->>'role';
    
    IF user_role IS NULL THEN
      user_role := 'candidate';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role);

    IF user_role = 'candidate' THEN
      INSERT INTO public.candidates (user_id, name, skills)
      VALUES (NEW.id, extracted_name, '{}');
    ELSIF user_role = 'recruiter' THEN
      INSERT INTO public.recruiters (user_id, name, company_name)
      VALUES (NEW.id, extracted_name, 'New Company');
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;
