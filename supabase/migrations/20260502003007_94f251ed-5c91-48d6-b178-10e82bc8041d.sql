ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS colorways jsonb NOT NULL DEFAULT '[]';