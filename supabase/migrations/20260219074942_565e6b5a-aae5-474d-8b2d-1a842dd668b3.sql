
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can read merchant by slug" ON public.merchants;

-- Create a restricted public view exposing only safe fields
CREATE OR REPLACE VIEW public.merchant_storefronts AS
SELECT 
  store_slug,
  store_name,
  store_description,
  store_tagline,
  store_category,
  brand_config
FROM public.merchants
WHERE store_slug IS NOT NULL 
  AND onboarding_completed = true;

-- Grant public read access to the view
GRANT SELECT ON public.merchant_storefronts TO anon;
GRANT SELECT ON public.merchant_storefronts TO authenticated;
