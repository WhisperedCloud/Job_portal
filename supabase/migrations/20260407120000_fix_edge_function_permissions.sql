-- Fix 1: Allow service_role to UPDATE candidates (for LinkedIn URL and enrichment fields stored by edge functions)
-- The enrich-profile and parse-resume edge functions use service role to update candidates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'candidates' 
    AND policyname = 'Service role can update candidates'
  ) THEN
    CREATE POLICY "Service role can update candidates"
      ON public.candidates
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Fix 2: Allow service_role to SELECT candidates (for edge function reads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'candidates' 
    AND policyname = 'Service role can select candidates'
  ) THEN
    CREATE POLICY "Service role can select candidates"
      ON public.candidates
      FOR SELECT
      TO service_role
      USING (true);
  END IF;
END $$;

-- Fix 3: Allow service_role to SELECT applications (for analyze-resume to fetch candidate_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'applications' 
    AND policyname = 'Service role can select applications'
  ) THEN
    CREATE POLICY "Service role can select applications"
      ON public.applications
      FOR SELECT
      TO service_role
      USING (true);
  END IF;
END $$;

-- Fix 4: Ensure analysis_results INSERT policy exists for service_role (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analysis_results' 
    AND policyname = 'Service role can insert analysis results'
  ) THEN
    CREATE POLICY "Service role can insert analysis results"
      ON public.analysis_results
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Fix 5: Also allow service_role to UPDATE analysis_results (for re-analysis)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analysis_results' 
    AND policyname = 'Service role can update analysis results'
  ) THEN
    CREATE POLICY "Service role can update analysis results"
      ON public.analysis_results
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
