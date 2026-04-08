-- Add enrichment and vector metadata to candidates
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS seniority_level TEXT,
ADD COLUMN IF NOT EXISTS domain_expertise TEXT[],
ADD COLUMN IF NOT EXISTS career_trajectory TEXT,
ADD COLUMN IF NOT EXISTS vector_id TEXT; -- ID in Pinecone/FAISS

-- Add vector metadata to jobs
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS job_vector_id TEXT;

-- Create table for recruiter feedback signals (LTR)
CREATE TABLE IF NOT EXISTS public.ranker_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    action_type TEXT CHECK (action_type IN ('shortlist', 'reject', 'hire', 'view')),
    score_boost FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup in ranking logic
CREATE INDEX IF NOT EXISTS idx_ranker_signals_candidate_job ON public.ranker_signals(candidate_id, job_id);

-- Create table for configurable weights
CREATE TABLE IF NOT EXISTS public.matching_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES public.recruiters(id) ON DELETE CASCADE,
    semantic_weight FLOAT DEFAULT 0.4,
    skills_weight FLOAT DEFAULT 0.3,
    experience_weight FLOAT DEFAULT 0.2,
    feedback_weight FLOAT DEFAULT 0.1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
