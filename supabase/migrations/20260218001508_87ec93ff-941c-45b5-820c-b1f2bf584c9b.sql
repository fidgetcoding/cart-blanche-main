
-- Fix the overly permissive events INSERT policy by requiring merchant_id to be non-null
DROP POLICY "Anyone can insert events" ON public.events;
CREATE POLICY "Anyone can insert events with merchant_id" ON public.events FOR INSERT WITH CHECK (merchant_id IS NOT NULL AND session_id IS NOT NULL);
