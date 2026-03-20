-- Add Foreign Keys to support Supabase PostgREST nested table queries
DO $$
BEGIN
    -- Link candidates reliably to auth.users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_candidates_user') THEN
        ALTER TABLE public.candidates 
            ADD CONSTRAINT fk_candidates_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
    END IF;

    -- Link recruiters reliably to auth.users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_recruiters_user') THEN
        ALTER TABLE public.recruiters 
            ADD CONSTRAINT fk_recruiters_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
    END IF;

    -- Enable job:jobs(recruiter:recruiters(...))
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jobs_recruiter') THEN
        ALTER TABLE public.jobs 
            ADD CONSTRAINT fk_jobs_recruiter FOREIGN KEY (recruiter_id) REFERENCES public.recruiters(id) ON DELETE CASCADE NOT VALID;
    END IF;

    -- Enable applications fetching job:jobs(...)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_applications_job') THEN
        ALTER TABLE public.applications 
            ADD CONSTRAINT fk_applications_job FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE NOT VALID;
    END IF;

    -- Enable applications fetching candidate:candidates(...)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_applications_candidate') THEN
        ALTER TABLE public.applications 
            ADD CONSTRAINT fk_applications_candidate FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE NOT VALID;
    END IF;
END $$;

-- Hard flush the Supabase caching engine
NOTIFY pgrst, 'reload schema';
