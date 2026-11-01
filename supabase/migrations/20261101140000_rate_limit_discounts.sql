-- validate_discount is open to anonymous shoppers, which made guessing codes free.
-- It now counts lookups per visitor and failed guesses per store, in the database,
-- so the limit holds however the function is called.

-- The caller's address from the platform's headers. The start of x-forwarded-for
-- is whatever the client sent, so only its last entry is used.
CREATE OR REPLACE FUNCTION public.request_client_ip()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    nullif(btrim(h.headers ->> 'cf-connecting-ip'), ''),
    nullif(btrim(h.headers ->> 'x-real-ip'), ''),
    nullif(btrim(regexp_replace(h.headers ->> 'x-forwarded-for', '^.*,', '')), ''),
    'unknown'
  )
  FROM (SELECT nullif(current_setting('request.headers', true), '')::json AS headers) h
$$;

REVOKE ALL ON FUNCTION public.request_client_ip() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_discount(p_merchant_id uuid, p_code text)
RETURNS TABLE (
  code text,
  discount_type text,
  discount_value numeric,
  description text,
  minimum_spend numeric,
  status text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c_visitor_limit constant integer := 20;     -- lookups a minute per visitor
  c_miss_limit constant integer := 300;       -- failed guesses an hour per store
  c_miss_window constant integer := 3600;
  v_misses text := 'discount:misses:' || p_merchant_id::text;
  v_match public.discount_codes%ROWTYPE;
  v_status text;
BEGIN
  IF NOT public.edge_rate_limit_hit('discount:ip:' || public.request_client_ip(), c_visitor_limit, 60)
    OR EXISTS (
      SELECT 1 FROM public.edge_rate_limits r
      WHERE r.bucket = v_misses
        AND r.window_start = to_timestamp(floor(extract(epoch FROM now()) / c_miss_window) * c_miss_window)
        AND r.hits >= c_miss_limit
    )
  THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::numeric, NULL::text, NULL::numeric, 'rate_limited'::text;
    RETURN;
  END IF;

  SELECT d.* INTO v_match
  FROM public.discount_codes d
  WHERE d.merchant_id = p_merchant_id
    AND d.is_active
    AND lower(d.code) = lower(btrim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    PERFORM public.edge_rate_limit_hit(v_misses, c_miss_limit, c_miss_window);
    RETURN;
  END IF;

  v_status := CASE
    WHEN v_match.starts_at > now() THEN 'not_started'
    WHEN v_match.expires_at <= now() THEN 'expired'
    WHEN v_match.max_uses IS NOT NULL AND v_match.times_used >= v_match.max_uses THEN 'exhausted'
    ELSE 'ok'
  END;

  -- Values stay hidden unless the code is usable.
  RETURN QUERY SELECT
    v_match.code,
    CASE WHEN v_status = 'ok' THEN v_match.discount_type END,
    CASE WHEN v_status = 'ok' THEN v_match.discount_value END,
    CASE WHEN v_status = 'ok' THEN v_match.description END,
    CASE WHEN v_status = 'ok' THEN v_match.minimum_spend END,
    v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_discount(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_discount(uuid, text) TO anon, authenticated, service_role;
