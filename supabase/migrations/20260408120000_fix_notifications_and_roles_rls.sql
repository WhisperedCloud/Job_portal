-- Step 1: Enable RLS on tables (idempotent)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 2: Policy for user_roles
-- Allow users to SELECT their own user role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_roles' 
    AND policyname = 'Users can select their own user role'
  ) THEN
    CREATE POLICY "Users can select their own user role"
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Step 3: Policies for notifications
-- Allow users to SELECT their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can select their own notifications'
  ) THEN
    CREATE POLICY "Users can select their own notifications"
      ON public.notifications
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.id = notifications.user_id 
          AND ur.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow users to UPDATE their own notifications (e.g. mark as read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can update their own notifications'
  ) THEN
    CREATE POLICY "Users can update their own notifications"
      ON public.notifications
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.id = notifications.user_id 
          AND ur.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.id = notifications.user_id 
          AND ur.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Step 4: Enable Realtime for notifications table
-- This enables Supabase Realtime to broadcast changes to this table
DO $$
BEGIN
  -- Enable realtime if the publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ELSE
    -- Create publication if it doesn't exist (less likely in Supabase)
    CREATE PUBLICATION supabase_realtime FOR TABLE public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Table might already be in a publication
  NULL;
END $$;

-- Step 5: Retroactive population of matching notifications (one-time)
-- This inserts job alerts for existing candidates who haven't received them yet
INSERT INTO public.notifications (user_id, type, data, is_read)
SELECT ur.id, 'job_alert', 
       jsonb_build_object(
         'job_id', j.id,
         'job_title', j.title,
         'company', j.company_name,
         'location', j.location,
         'skills_required', j.skills_required
       ), 
       false
FROM public.jobs j
JOIN public.candidates c ON (j.skills_required && c.skills)
JOIN public.user_roles ur ON c.user_id = ur.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n 
  WHERE n.user_id = ur.id 
  AND (n.data->>'job_id')::uuid = j.id
  AND n.type = 'job_alert'
);

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
