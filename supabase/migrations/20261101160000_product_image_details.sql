-- Inventory lets a merchant pick the grid photo, tag photos with a color and use a
-- different file for each size. products.images only holds one URL per photo, so all
-- of that vanished on reload for real products.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_details jsonb;
