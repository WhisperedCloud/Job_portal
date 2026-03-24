-- COMPREHENSIVE FIX AND SYNC SCRIPT
-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. Ensure UNIQUE constraints exist to prevent silent failures
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_key') THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidates_user_id_key') THEN
        ALTER TABLE public.candidates ADD CONSTRAINT candidates_user_id_key UNIQUE (user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recruiters_user_id_key') THEN
        ALTER TABLE public.recruiters ADD CONSTRAINT recruiters_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- 2. Update the Trigger Function for robust, multi-role handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_role TEXT;
    extracted_name TEXT;
BEGIN
    -- Extract role from metadata, default to 'candidate'
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'candidate');
    extracted_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

    -- A. Sync to user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    -- B. Sync to specific profile tables
    IF user_role = 'candidate' THEN
        INSERT INTO public.candidates (user_id, name, email)
        VALUES (NEW.id, extracted_name, NEW.email)
        ON CONFLICT (user_id) DO NOTHING; -- Keep existing profile if it exists
    ELSIF user_role = 'recruiter' THEN
        INSERT INTO public.recruiters (user_id, company_name)
        VALUES (NEW.id, 'New Company')
        ON CONFLICT (user_id) DO NOTHING; -- Keep existing recruiter profile
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'User sync failed for ID %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Re-attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RETROACTIVE SYNC: Sync all missing users from auth.users to public tables
DO $$
DECLARE
    r RECORD;
    u_role TEXT;
    u_name TEXT;
BEGIN
    FOR r IN (SELECT id, email, raw_user_meta_data FROM auth.users) LOOP
        -- Infer role
        u_role := COALESCE(r.raw_user_meta_data->>'role', 'candidate');
        u_name := COALESCE(r.raw_user_meta_data->>'name', split_part(r.email, '@', 1));

        -- Sync to user_roles
        INSERT INTO public.user_roles (user_id, role)
        VALUES (r.id, u_role)
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

        -- Sync to profiles
        IF u_role = 'candidate' THEN
            INSERT INTO public.candidates (user_id, name, email)
            VALUES (r.id, u_name, r.email)
            ON CONFLICT (user_id) DO NOTHING;
        ELSIF u_role = 'recruiter' THEN
            INSERT INTO public.recruiters (user_id, company_name)
            VALUES (r.id, 'New Company')
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;
