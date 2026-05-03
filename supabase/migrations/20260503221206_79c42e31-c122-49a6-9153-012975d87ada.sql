CREATE TABLE public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  welcome_code text NOT NULL DEFAULT 'WELCOME10',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX subscribers_unique
  ON public.subscribers (merchant_id, lower(email));

CREATE INDEX subscribers_merchant_created
  ON public.subscribers (merchant_id, created_at DESC);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert subscribers"
  ON public.subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Merchants can read own subscribers"
  ON public.subscribers FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update own subscribers"
  ON public.subscribers FOR UPDATE
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can delete own subscribers"
  ON public.subscribers FOR DELETE
  USING (auth.uid() = merchant_id);