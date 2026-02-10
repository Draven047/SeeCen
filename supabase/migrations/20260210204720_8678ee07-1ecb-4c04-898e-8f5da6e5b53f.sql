
-- Add communication preferences and additional profile fields to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS preferred_channel text DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS communication_opt_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

COMMENT ON COLUMN public.customers.preferred_channel IS 'Preferred communication channel: whatsapp, email, sms, phone';
COMMENT ON COLUMN public.customers.communication_opt_in IS 'Whether customer has opted in to marketing communications';
COMMENT ON COLUMN public.customers.tags IS 'Custom tags for segmentation e.g. VIP, wholesale, influencer';
