-- Newer Supabase projects no longer expose new tables to the Data API by default,
-- so without these grants the app fails on a fresh project with "permission denied".
-- RLS still decides which rows each role sees; these decide which tables it can reach.
-- Older projects had broad default grants, so each table is reset to the same state.
-- edge_rate_limits is left out on purpose: it stays service_role only.

REVOKE ALL ON
  public.chat_messages,
  public.conversations,
  public.discount_codes,
  public.editorial_tiles,
  public.events,
  public.flow_editor_state,
  public.grid_layouts,
  public.hotzones,
  public.merchants,
  public.orders,
  public.product_pairings,
  public.product_variants,
  public.products,
  public.size_charts,
  public.store_config,
  public.styling_guides,
  public.subscribers,
  public.waitlist_signups
FROM PUBLIC, anon, authenticated;

GRANT ALL ON
  public.chat_messages,
  public.conversations,
  public.discount_codes,
  public.editorial_tiles,
  public.events,
  public.flow_editor_state,
  public.grid_layouts,
  public.hotzones,
  public.merchants,
  public.orders,
  public.product_pairings,
  public.product_variants,
  public.products,
  public.size_charts,
  public.store_config,
  public.styling_guides,
  public.subscribers,
  public.waitlist_signups
TO service_role;

-- What the public storefront reads.
GRANT SELECT ON
  public.editorial_tiles,
  public.grid_layouts,
  public.hotzones,
  public.product_pairings,
  public.product_variants,
  public.products,
  public.size_charts,
  public.styling_guides
TO anon;

-- Signed-in merchants, limited to their own rows by RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.chat_messages,
  public.conversations,
  public.discount_codes,
  public.editorial_tiles,
  public.flow_editor_state,
  public.grid_layouts,
  public.hotzones,
  public.orders,
  public.product_pairings,
  public.product_variants,
  public.products,
  public.size_charts,
  public.store_config,
  public.styling_guides,
  public.subscribers,
  public.waitlist_signups
TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.merchants TO authenticated;
GRANT SELECT ON public.events TO authenticated;
