-- Add interview related columns to applications table
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS interview_date DATE,
ADD COLUMN IF NOT EXISTS interview_time TIME,
ADD COLUMN IF NOT EXISTS interview_mode TEXT,
ADD COLUMN IF NOT EXISTS interview_venue TEXT,
ADD COLUMN IF NOT EXISTS interview_link TEXT,
ADD COLUMN IF NOT EXISTS interview_notes TEXT,
ADD COLUMN IF NOT EXISTS interview_scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS interview_rescheduled_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reschedule_reason TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
