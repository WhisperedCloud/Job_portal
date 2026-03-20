-- Add the missing email column to the candidates table
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS email TEXT;

-- Notify PostgREST to quickly reload the schema cache
NOTIFY pgrst, 'reload schema';
