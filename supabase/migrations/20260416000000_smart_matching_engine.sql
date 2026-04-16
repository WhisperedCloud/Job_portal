-- Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding and enrichment columns to candidates table
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS embedding vector(768), -- Using 768 for Gemini text-embedding-004
ADD COLUMN IF NOT EXISTS linkedin_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS seniority text,
ADD COLUMN IF NOT EXISTS domain_focus text,
ADD COLUMN IF NOT EXISTS career_trajectory text;

-- Add embedding column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create ranker_signals table to capture recruiter actions for LTR
CREATE TABLE IF NOT EXISTS public.ranker_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  recruiter_id UUID REFERENCES public.recruiters(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('shortlist', 'reject', 'view', 'hire')),
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for ranker_signals
ALTER TABLE public.ranker_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can insert their own signals" 
ON public.ranker_signals FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Simplified for now, in production check recruiter role

CREATE POLICY "Recruiters can view their own signals" 
ON public.ranker_signals FOR SELECT 
TO authenticated 
USING (true);

-- Create matching_config table for recruiter-specific weights
CREATE TABLE IF NOT EXISTS public.matching_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES public.recruiters(id) ON DELETE CASCADE,
  skills_weight FLOAT DEFAULT 0.4,
  experience_weight FLOAT DEFAULT 0.3,
  domain_weight FLOAT DEFAULT 0.2,
  trajectory_weight FLOAT DEFAULT 0.1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recruiter_id)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_matching_config_updated_at
BEFORE UPDATE ON public.matching_config
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS for matching_config
ALTER TABLE public.matching_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can manage their own config" 
ON public.matching_config FOR ALL 
TO authenticated 
USING (true);
