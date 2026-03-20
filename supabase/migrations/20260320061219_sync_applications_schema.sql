-- Add the missing cover_letter column to the applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;

-- Notify PostgREST to quickly reload the schema cache so 400 errors go away instantly
NOTIFY pgrst, 'reload schema';
