-- Merchants aren't publicly readable, so a store's saved name never reached its
-- storefront. This hands out the name and nothing else from that table.
CREATE OR REPLACE FUNCTION public.store_name(p_merchant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT nullif(trim(store_name), '') FROM public.merchants WHERE id = p_merchant_id;
$$;

REVOKE ALL ON FUNCTION public.store_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_name(uuid) TO anon, authenticated;
