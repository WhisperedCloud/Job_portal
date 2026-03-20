-- Update the handle_new_user function to include email in candidates table
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
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    -- Create appropriate profile based on role
    IF user_role = 'candidate' THEN
      INSERT INTO public.candidates (user_id, name, email, skills)
      VALUES (NEW.id, extracted_name, NEW.email, '{}')
      ON CONFLICT (user_id) DO UPDATE SET 
        email = EXCLUDED.email,
        name = COALESCE(public.candidates.name, EXCLUDED.name);
    ELSIF user_role = 'recruiter' THEN
      INSERT INTO public.recruiters (user_id, name, company_name)
      VALUES (NEW.id, extracted_name, 'New Company')
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Update existing candidates with their email from auth.users
UPDATE public.candidates c
SET email = u.email
FROM auth.users u
WHERE c.user_id = u.id
AND (c.email IS NULL OR c.email = '');

-- Notify PostgREST to quickly reload the schema cache
NOTIFY pgrst, 'reload schema';
