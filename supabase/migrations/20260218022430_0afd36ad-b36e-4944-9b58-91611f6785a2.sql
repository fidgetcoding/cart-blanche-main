
-- Product pairings table for merchant-defined pairings
CREATE TABLE public.product_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  paired_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  pairing_strength integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, paired_product_id)
);

ALTER TABLE public.product_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can CRUD own pairings"
  ON public.product_pairings FOR ALL
  USING (auth.uid() = merchant_id);

CREATE POLICY "Public can read pairings"
  ON public.product_pairings FOR SELECT
  USING (true);

-- Styling guide table for merchant-configured category pairing rules
CREATE TABLE public.styling_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Default Guide',
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- rules is an array of { anchor_category: string, suggested_categories: string[], orientation: 'horizontal' | 'vertical' }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.styling_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can CRUD own styling guides"
  ON public.styling_guides FOR ALL
  USING (auth.uid() = merchant_id);

CREATE POLICY "Public can read styling guides"
  ON public.styling_guides FOR SELECT
  USING (true);

CREATE TRIGGER update_styling_guides_updated_at
  BEFORE UPDATE ON public.styling_guides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
