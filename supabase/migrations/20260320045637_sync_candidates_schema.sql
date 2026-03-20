DO $$
BEGIN
  -- Rename full_name to name if full_name exists and name does not
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='candidates' and column_name='full_name') 
  AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='candidates' and column_name='name') THEN
    ALTER TABLE public.candidates RENAME COLUMN full_name TO name;
  END IF;

  -- Add missing columns
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='candidates' and column_name='phone') THEN
    ALTER TABLE public.candidates ADD COLUMN phone TEXT;
  END IF;
  
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='candidates' and column_name='location') THEN
    ALTER TABLE public.candidates ADD COLUMN location TEXT;
  END IF;

  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='candidates' and column_name='education') THEN
    ALTER TABLE public.candidates ADD COLUMN education TEXT;
  END IF;

  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='candidates' and column_name='license_type') THEN
    ALTER TABLE public.candidates ADD COLUMN license_type TEXT;
  END IF;

  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='candidates' and column_name='license_number') THEN
    ALTER TABLE public.candidates ADD COLUMN license_number TEXT;
  END IF;

  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='candidates' and column_name='email') THEN
    ALTER TABLE public.candidates ADD COLUMN email TEXT;
  END IF;
  
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='candidates' and column_name='created_at') THEN
    ALTER TABLE public.candidates ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='candidates' and column_name='updated_at') THEN
    ALTER TABLE public.candidates ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;
