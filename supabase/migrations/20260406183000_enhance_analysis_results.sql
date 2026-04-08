-- Add rich analysis columns to analysis_results
ALTER TABLE public.analysis_results
ADD COLUMN IF NOT EXISTS strengths TEXT[],
ADD COLUMN IF NOT EXISTS gaps TEXT[],
ADD COLUMN IF NOT EXISTS breakdown JSONB;

-- Add comment for clarity
COMMENT ON COLUMN public.analysis_results.breakdown IS 'Stores the breakdown of the match score (e.g., llm_analysis, skill_score, seniority_score, etc.)';
