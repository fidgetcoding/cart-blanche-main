-- Add gender column to products (free-form text, defaults to 'unisex')
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'unisex';

-- Add hidden_genders array to grid_layouts (mirrors hidden_tags + hidden_product_types pattern)
ALTER TABLE public.grid_layouts
  ADD COLUMN IF NOT EXISTS hidden_genders text[] NOT NULL DEFAULT '{}';