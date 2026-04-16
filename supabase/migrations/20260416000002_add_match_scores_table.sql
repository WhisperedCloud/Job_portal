-- Create table for persistent match scores
CREATE TABLE IF NOT EXISTS public.candidate_job_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(candidate_id, job_id)
);

-- Enable RLS
ALTER TABLE public.candidate_job_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view their own scores" 
ON public.candidate_job_scores FOR SELECT 
TO authenticated 
USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Candidates can upsert their own scores" 
ON public.candidate_job_scores FOR INSERT 
TO authenticated 
WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Candidates can update their own scores" 
ON public.candidate_job_scores FOR UPDATE 
TO authenticated 
USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));
