-- Add missing enrichment columns to candidates table
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS resume_text TEXT,
ADD COLUMN IF NOT EXISTS linkedin_summary TEXT,
ADD COLUMN IF NOT EXISTS projects TEXT;

-- Update RLS policies to ensure candidates can read their own new columns
-- (Usually select * covers this, but being explicit helps if there are restrictive policies)
COMMENT ON COLUMN public.candidates.resume_text IS 'Plain text extracted from candidate resume';
COMMENT ON COLUMN public.candidates.linkedin_summary IS 'AI-generated summary from LinkedIn profile';
COMMENT ON COLUMN public.candidates.projects IS 'Consolidated project details from all sources';
