-- Tighten the events INSERT policy to validate merchant exists and restrict event types
DROP POLICY IF EXISTS "Anyone can insert events with merchant_id" ON public.events;

CREATE POLICY "Public can insert events for active merchants" ON public.events
FOR INSERT WITH CHECK (
  merchant_id IS NOT NULL
  AND session_id IS NOT NULL
  AND event_type IN ('page_view', 'product_view', 'add_to_cart', 'checkout_started', 'purchase', 'hotzone_enter', 'hotzone_exit')
  AND EXISTS (
    SELECT 1 FROM public.merchants
    WHERE id = merchant_id
    AND onboarding_completed = true
  )
);