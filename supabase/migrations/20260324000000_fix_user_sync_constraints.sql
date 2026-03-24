-- Add UNIQUE constraints to user_id to support ON CONFLICT
DO $$ 
BEGIN 
    -- user_roles table
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_user_id_key'
    ) THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
    END IF;

    -- candidates table
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'candidates_user_id_key'
    ) THEN
        ALTER TABLE public.candidates ADD CONSTRAINT candidates_user_id_key UNIQUE (user_id);
    END IF;

    -- recruiters table
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'recruiters_user_id_key'
    ) THEN
        ALTER TABLE public.recruiters ADD CONSTRAINT recruiters_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Update the handle_new_user function with better error logging and robustness
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  extracted_name TEXT := SPLIT_PART(NEW.email, '@', 1);
  user_role TEXT;
BEGIN
  -- Get role from user metadata (passed during signUp)
  user_role := NEW.raw_user_meta_data->>'role';
  
  -- Default to 'candidate' if no role is provided
  IF user_role IS NULL THEN
    user_role := 'candidate';
  END IF;

  -- 1. Insert/Update into user_roles
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      role = EXCLUDED.role,
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'ERROR [handle_new_user] user_roles sync failed for %: %', NEW.id, SQLERRM;
  END;

  -- 2. Insert/Update into specific profile table
  BEGIN
    IF user_role = 'candidate' THEN
      INSERT INTO public.candidates (user_id, name, email, skills)
      VALUES (NEW.id, extracted_name, NEW.email, '{}')
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        name = COALESCE(public.candidates.name, EXCLUDED.name),
        updated_at = NOW();
    ELSIF user_role = 'recruiter' THEN
      INSERT INTO public.recruiters (user_id, name, company_name)
      VALUES (NEW.id, extracted_name, 'New Company')
      ON CONFLICT (user_id) 
      DO NOTHING; -- Don't overwrite company info if it exists
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'ERROR [handle_new_user] profile sync failed for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger is still there (it should be, but just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- Flush PostgREST cache
NOTIFY pgrst, 'reload schema';
