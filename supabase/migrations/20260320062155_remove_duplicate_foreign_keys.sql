-- Remove the duplicate Foreign Keys that triggered "more than one relationship found"
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS fk_candidates_user;
ALTER TABLE public.recruiters DROP CONSTRAINT IF EXISTS fk_recruiters_user;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS fk_jobs_recruiter;
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS fk_applications_job;
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS fk_applications_candidate;

-- Forcefully refresh the PostgREST cache so the API recognizes precisely one relationship
NOTIFY pgrst, 'reload schema';
