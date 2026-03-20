-- Fix RLS on analysis_results: currently RLS is ON with zero policies (nobody can read)
-- Allow authenticated users to read analysis results for their own applications

-- Recruiters can read analysis for applications on their jobs
CREATE POLICY "Recruiters can read analysis results"
  ON public.analysis_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.recruiters r ON r.id = j.recruiter_id
      WHERE a.id = analysis_results.application_id
        AND r.user_id = auth.uid()
    )
  );

-- Candidates can read their own analysis results
CREATE POLICY "Candidates can read their own analysis results"
  ON public.analysis_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.candidates c ON c.id = a.candidate_id
      WHERE a.id = analysis_results.application_id
        AND c.user_id = auth.uid()
    )
  );

-- Allow INSERT from service role (edge functions)
CREATE POLICY "Service role can insert analysis results"
  ON public.analysis_results
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
