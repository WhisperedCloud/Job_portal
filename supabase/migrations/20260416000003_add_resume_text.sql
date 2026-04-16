-- Add resume_text column to candidates for AI enrichment
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS resume_text TEXT;

-- Update the existing candidates logic to populate it if missing (optional/proactive)
COMMENT ON COLUMN public.candidates.resume_text IS 'Full text extracted from candidate resume for AI analysis';
