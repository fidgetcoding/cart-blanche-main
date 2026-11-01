-- Security hardening for the public repo and logged-out demo.
-- Deploy this BEFORE the updated edge functions: they fail closed without
-- edge_rate_limit_hit, and the storefront needs validate_discount.

-- ── Storage: product-media ────────────────────────────────────────────────
-- Any signed-in merchant could overwrite or delete any other merchant's media.
DROP POLICY IF EXISTS "Authenticated users can update product media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product media" ON storage.objects;

CREATE POLICY "Owners can update product media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-media' AND owner_id = auth.uid()::text);

CREATE POLICY "Owners can delete product media"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-media' AND owner_id = auth.uid()::text);

-- SVG is left out on purpose: a public bucket would serve scriptable markup.
UPDATE storage.buckets
SET file_size_limit = 52428800, -- 50 MB
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
WHERE id = 'product-media';

-- ── Storage: chat-uploads ─────────────────────────────────────────────────
-- Public buckets serve object URLs without a SELECT policy, so dropping this
-- only removes anonymous listing. Plain uploads need INSERT alone.
DROP POLICY IF EXISTS "Anyone can read chat images" ON storage.objects;

UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'chat-uploads';

-- ── merchants ─────────────────────────────────────────────────────────────
-- Exposed every column of onboarded merchants, including email and Stripe id.
DROP POLICY IF EXISTS "Public can read onboarded merchant profiles" ON public.merchants;

-- ── discount_codes ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can read active discount codes" ON public.discount_codes;

-- Checks one code for one merchant. Values stay hidden unless the code is usable.
CREATE OR REPLACE FUNCTION public.validate_discount(p_merchant_id uuid, p_code text)
RETURNS TABLE (
  code text,
  discount_type text,
  discount_value numeric,
  description text,
  minimum_spend numeric,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    s.code,
    CASE WHEN s.status = 'ok' THEN s.discount_type END,
    CASE WHEN s.status = 'ok' THEN s.discount_value END,
    CASE WHEN s.status = 'ok' THEN s.description END,
    CASE WHEN s.status = 'ok' THEN s.minimum_spend END,
    s.status
  FROM (
    SELECT
      d.code,
      d.discount_type,
      d.discount_value,
      d.description,
      d.minimum_spend,
      CASE
        WHEN d.starts_at > now() THEN 'not_started'
        WHEN d.expires_at <= now() THEN 'expired'
        WHEN d.max_uses IS NOT NULL AND d.times_used >= d.max_uses THEN 'exhausted'
        ELSE 'ok'
      END AS status
    FROM public.discount_codes d
    WHERE d.merchant_id = p_merchant_id
      AND d.is_active
      AND lower(d.code) = lower(btrim(p_code))
    LIMIT 1
  ) s
$$;

REVOKE ALL ON FUNCTION public.validate_discount(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_discount(uuid, text) TO anon, authenticated, service_role;

-- ── subscribers, waitlist_signups, events ─────────────────────────────────
-- WITH CHECK (true) let anyone insert rows against any merchant.
DROP POLICY IF EXISTS "Anyone can insert subscribers" ON public.subscribers;
CREATE POLICY "Merchants can insert own subscribers"
ON public.subscribers FOR INSERT
WITH CHECK (auth.uid() = merchant_id);

DROP POLICY IF EXISTS "Anyone can insert waitlist signups" ON public.waitlist_signups;
CREATE POLICY "Merchants can insert own waitlist signups"
ON public.waitlist_signups FOR INSERT
WITH CHECK (auth.uid() = merchant_id);

-- Nothing in src or the edge functions writes events.
DROP POLICY IF EXISTS "Public can insert events for active merchants" ON public.events;

-- ── Platform-controlled columns ───────────────────────────────────────────
-- Browser requests run as anon or authenticated, so those roles keep the
-- stored value. service_role and migrations can still change these columns.
CREATE OR REPLACE FUNCTION public.guard_merchant_platform_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.stripe_connected_account_id := NULL;
    ELSE
      NEW.stripe_connected_account_id := OLD.stripe_connected_account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_merchant_platform_columns
BEFORE INSERT OR UPDATE ON public.merchants
FOR EACH ROW EXECUTE FUNCTION public.guard_merchant_platform_columns();

CREATE OR REPLACE FUNCTION public.guard_store_config_platform_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.platform_fee_percent := 5.0;
    ELSE
      NEW.platform_fee_percent := OLD.platform_fee_percent;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_store_config_platform_columns
BEFORE INSERT OR UPDATE ON public.store_config
FOR EACH ROW EXECUTE FUNCTION public.guard_store_config_platform_columns();

-- ── Edge function rate limits ─────────────────────────────────────────────
-- RLS with no policies plus revoked grants: only service_role can reach this.
CREATE TABLE public.edge_rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX edge_rate_limits_window_start ON public.edge_rate_limits (window_start);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.edge_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.edge_rate_limits TO service_role;

-- Counts a hit against a fixed time window and says whether it is within limit.
CREATE OR REPLACE FUNCTION public.edge_rate_limit_hit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_window_start timestamptz := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );
  v_hits integer;
BEGIN
  INSERT INTO public.edge_rate_limits (bucket, window_start)
  VALUES (p_bucket, v_window_start)
  ON CONFLICT (bucket, window_start)
  DO UPDATE SET hits = public.edge_rate_limits.hits + 1
  RETURNING hits INTO v_hits;

  IF random() < 0.01 THEN
    DELETE FROM public.edge_rate_limits WHERE window_start < now() - interval '2 days';
  END IF;

  RETURN v_hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.edge_rate_limit_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_rate_limit_hit(text, integer, integer) TO service_role;
