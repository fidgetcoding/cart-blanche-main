
-- Add a narrowly-scoped public SELECT policy for the view to work via SECURITY INVOKER
-- This only allows reading the specific rows the view already filters
CREATE POLICY "Public can read onboarded merchant profiles"
ON public.merchants FOR SELECT
USING (store_slug IS NOT NULL AND onboarding_completed = true);
