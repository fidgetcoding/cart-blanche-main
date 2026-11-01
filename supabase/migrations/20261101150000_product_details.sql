-- The add-product form and inventory collect these, but they had nowhere to go for
-- real products, so they vanished on reload.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS weight_oz numeric NOT NULL DEFAULT 0 CHECK (weight_oz >= 0),
  ADD COLUMN IF NOT EXISTS shipping_type text NOT NULL DEFAULT 'domestic' CHECK (shipping_type IN ('domestic', 'international')),
  ADD COLUMN IF NOT EXISTS hs_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS video_url text;
