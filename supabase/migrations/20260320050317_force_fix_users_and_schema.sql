DO $$ 
BEGIN 
  ALTER TABLE public.candidates RENAME COLUMN full_name TO name; 
EXCEPTION WHEN OTHERS THEN 
  NULL; 
END $$;

DO $$ BEGIN ALTER TABLE public.candidates ADD COLUMN phone TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.candidates ADD COLUMN location TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.candidates ADD COLUMN education TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.candidates ADD COLUMN license_type TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.candidates ADD COLUMN license_number TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.candidates ADD COLUMN email TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Fix any missing user roles that were lost due to the original faulty trigger
INSERT INTO public.user_roles (id, user_id, role)
SELECT gen_random_uuid(), id, 'candidate'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles);

-- Fix any missing candidate profiles
INSERT INTO public.candidates (id, user_id, name)
SELECT gen_random_uuid(), id, split_part(email, '@', 1)
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.candidates)
AND id IN (SELECT user_id FROM public.user_roles WHERE role = 'candidate');

-- Force PostgREST to reload its schema cache so the API knows about the new columns
NOTIFY pgrst, 'reload schema';
