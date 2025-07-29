
-- Create a trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Extract name from email (part before @)
  DECLARE
    extracted_name TEXT := SPLIT_PART(NEW.email, '@', 1);
    user_role TEXT;
  BEGIN
    -- Get role from user metadata
    user_role := NEW.raw_user_meta_data->>'role';
    
    -- Set default role if not provided
    IF user_role IS NULL THEN
      user_role := 'candidate';
    END IF;

    -- Insert user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role::user_role);

    -- Create appropriate profile based on role
    IF user_role = 'candidate' THEN
      INSERT INTO public.candidates (user_id, name, skills)
      VALUES (NEW.id, extracted_name, '{}');
    ELSIF user_role = 'recruiter' THEN
      INSERT INTO public.recruiters (user_id, name, company_name)
      VALUES (NEW.id, extracted_name, 'New Company');
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
