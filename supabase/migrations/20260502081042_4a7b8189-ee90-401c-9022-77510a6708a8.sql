ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS colorway_id text NULL;

CREATE INDEX IF NOT EXISTS idx_product_variants_colorway_id
  ON public.product_variants(colorway_id)
  WHERE colorway_id IS NOT NULL;