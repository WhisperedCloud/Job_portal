CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  extracted_name TEXT := SPLIT_PART(NEW.email, '@', 1);
  user_role TEXT;
BEGIN
  user_role := NEW.raw_user_meta_data->>'role';
  
  -- Default to regular user if no role is provided
  IF user_role IS NULL THEN
    user_role := 'candidate';
  END IF;

  -- Insert into user_roles
  BEGIN
    INSERT INTO public.user_roles (id, user_id, role)
    VALUES (gen_random_uuid(), NEW.id, user_role);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error inserting into user_roles for user %: %', NEW.id, SQLERRM;
  END;

  -- Insert into specific profile table based on role
  BEGIN
    IF user_role = 'candidate' THEN
      INSERT INTO public.candidates (id, user_id, name, skills)
      VALUES (gen_random_uuid(), NEW.id, extracted_name, ARRAY[]::TEXT[]);
    ELSIF user_role = 'recruiter' THEN
      INSERT INTO public.recruiters (id, user_id, name, company_name)
      VALUES (gen_random_uuid(), NEW.id, extracted_name, 'New Company');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error inserting into candidate/recruiter profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;
