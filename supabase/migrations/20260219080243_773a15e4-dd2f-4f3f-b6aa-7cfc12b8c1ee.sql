
-- Recreate view with SECURITY INVOKER to fix the security definer warning
DROP VIEW IF EXISTS public.merchant_storefronts;

CREATE VIEW public.merchant_storefronts
WITH (security_invoker = true) AS
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

GRANT SELECT ON public.merchant_storefronts TO anon;
GRANT SELECT ON public.merchant_storefronts TO authenticated;
