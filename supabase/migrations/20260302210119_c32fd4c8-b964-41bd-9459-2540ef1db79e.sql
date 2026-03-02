-- Add column to store individual hidden product IDs (for demo products whose status can't be persisted)
ALTER TABLE public.grid_layouts ADD COLUMN IF NOT EXISTS hidden_product_ids text[] NOT NULL DEFAULT '{}';
