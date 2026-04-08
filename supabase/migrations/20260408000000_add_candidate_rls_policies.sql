-- Enable RLS on candidates table
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to select their own candidate profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'candidates' 
    AND policyname = 'Users can select their own candidate profile'
  ) THEN
    CREATE POLICY "Users can select their own candidate profile"
      ON public.candidates
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy to allow authenticated users to update their own candidate profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'candidates' 
    AND policyname = 'Users can update their own candidate profile'
  ) THEN
    CREATE POLICY "Users can update their own candidate profile"
      ON public.candidates
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy to allow authenticated users to insert their own candidate profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'candidates' 
    AND policyname = 'Users can insert their own candidate profile'
  ) THEN
    CREATE POLICY "Users can insert their own candidate profile"
      ON public.candidates
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure service role policies still exist and are correct (these were already added, but for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'candidates' 
    AND policyname = 'Service role can manage candidates'
  ) THEN
    CREATE POLICY "Service role can manage candidates"
      ON public.candidates
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
