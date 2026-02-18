
-- Create discount_codes table
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed', 'free_shipping'
  discount_value NUMERIC NOT NULL DEFAULT 0, -- percentage amount or fixed dollar amount
  minimum_spend NUMERIC DEFAULT 0, -- minimum cart total to apply
  max_uses INTEGER DEFAULT NULL, -- null = unlimited
  times_used INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- null = no expiry
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT discount_codes_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE
);

-- Unique code per merchant
CREATE UNIQUE INDEX idx_discount_codes_merchant_code ON public.discount_codes (merchant_id, LOWER(code));

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Merchants can CRUD own discount codes
CREATE POLICY "Merchants can CRUD own discount codes"
ON public.discount_codes
FOR ALL
USING (auth.uid() = merchant_id)
WITH CHECK (auth.uid() = merchant_id);

-- Public can read active discount codes (needed for cart validation)
CREATE POLICY "Public can read active discount codes"
ON public.discount_codes
FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_discount_codes_updated_at
BEFORE UPDATE ON public.discount_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
