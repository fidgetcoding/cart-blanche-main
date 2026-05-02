ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS colorway_preference text NULL;

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_colorway_preference
  ON public.waitlist_signups(colorway_preference)
  WHERE colorway_preference IS NOT NULL;