CREATE TABLE public.size_charts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Size Chart',
  headers JSONB NOT NULL DEFAULT '["Size","Chest","Waist","Length"]'::jsonb,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  unit TEXT NOT NULL DEFAULT 'in',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, category)
);

ALTER TABLE public.size_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read size charts"
  ON public.size_charts
  FOR SELECT
  USING (true);

CREATE POLICY "Merchants can CRUD own size charts"
  ON public.size_charts
  FOR ALL
  USING (auth.uid() = merchant_id)
  WITH CHECK (auth.uid() = merchant_id);

CREATE TRIGGER update_size_charts_updated_at
  BEFORE UPDATE ON public.size_charts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_size_charts_merchant_category ON public.size_charts(merchant_id, category);