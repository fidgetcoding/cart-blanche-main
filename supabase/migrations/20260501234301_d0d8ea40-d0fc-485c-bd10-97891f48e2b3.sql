-- Waitlist signups for out-of-stock products. Captures shopper email +
-- name + optional size preference per product. Demo products use string
-- ids (p1, p9b, etc.); real products use stringified UUIDs. The
-- merchant_id on each row is the merchant whose storefront the shopper
-- was viewing when they signed up (so multiple merchants showing the
-- same demo product have separate waitlists).

CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  product_id text NOT NULL,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  size_preference text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX waitlist_signups_unique
  ON public.waitlist_signups (merchant_id, product_id, lower(email));

CREATE INDEX waitlist_signups_merchant_created
  ON public.waitlist_signups (merchant_id, created_at DESC);
CREATE INDEX waitlist_signups_merchant_product
  ON public.waitlist_signups (merchant_id, product_id, created_at DESC);
CREATE INDEX waitlist_signups_merchant_status
  ON public.waitlist_signups (merchant_id, status, created_at DESC);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert waitlist signups"
  ON public.waitlist_signups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Merchants can read own waitlist"
  ON public.waitlist_signups FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update own waitlist"
  ON public.waitlist_signups FOR UPDATE
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can delete own waitlist"
  ON public.waitlist_signups FOR DELETE
  USING (auth.uid() = merchant_id);