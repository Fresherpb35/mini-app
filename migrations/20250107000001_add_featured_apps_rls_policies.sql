-- Simplified RLS policies for featured_apps table
-- This migration fixes the "permission denied for table users" error

-- Enable RLS on featured_apps table (if not already enabled)
ALTER TABLE public.featured_apps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage featured apps" ON public.featured_apps;
DROP POLICY IF EXISTS "Allow all for service role" ON public.featured_apps;
DROP POLICY IF EXISTS "Public can view active featured apps" ON public.featured_apps;

-- Policy 1: Allow service role to do everything
-- This is the main policy that allows the backend (using service role key) to manage featured apps
CREATE POLICY "Allow all for service role"
ON public.featured_apps
FOR ALL
USING (true)
WITH CHECK (true);

-- Policy 2: Allow public read access to active featured apps
CREATE POLICY "Public can view active featured apps"
ON public.featured_apps
FOR SELECT
USING (is_active = true);

-- Grant necessary permissions to service_role
GRANT ALL ON public.featured_apps TO service_role;

-- Grant read permissions to anon and authenticated users
GRANT SELECT ON public.featured_apps TO anon;
GRANT SELECT ON public.featured_apps TO authenticated;

-- Note: The service role key used by the backend will bypass RLS anyway,
-- but these policies ensure explicit permissions are set correctly.
