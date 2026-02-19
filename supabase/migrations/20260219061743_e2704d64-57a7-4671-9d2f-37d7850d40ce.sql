
-- Stores the saved grid layout (product order + category tab order)
CREATE TABLE IF NOT EXISTS public.grid_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  layout_type text NOT NULL DEFAULT 'default',
  product_order text[] NOT NULL DEFAULT '{}',
  category_order text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(merchant_id, layout_type)
);

-- Enable RLS
ALTER TABLE public.grid_layouts ENABLE ROW LEVEL SECURITY;

-- Public can read (storefront needs it)
CREATE POLICY "Anyone can read grid layouts"
  ON public.grid_layouts FOR SELECT
  USING (true);

-- Merchants can manage their own layouts
CREATE POLICY "Merchants can upsert own grid layouts"
  ON public.grid_layouts FOR ALL
  USING (auth.uid() = merchant_id)
  WITH CHECK (auth.uid() = merchant_id);

-- Insert default row trigger on merchant creation
CREATE OR REPLACE FUNCTION public.create_default_grid_layout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.grid_layouts (merchant_id, layout_type)
  VALUES (NEW.id, 'default')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER create_grid_layout_on_merchant
  AFTER INSERT ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_grid_layout();
