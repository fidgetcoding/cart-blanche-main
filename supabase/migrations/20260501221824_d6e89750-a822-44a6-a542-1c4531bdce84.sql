ALTER TABLE public.grid_layouts 
  ADD COLUMN IF NOT EXISTS demo_product_overrides jsonb NOT NULL DEFAULT '{}';