
-- Add new columns to orders for omnichannel fulfillment
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'prepaid',
  ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'self_ship',
  ADD COLUMN IF NOT EXISTS sla_deadline timestamp with time zone,
  ADD COLUMN IF NOT EXISTS items_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS packed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS declined_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_reason text;

-- Update fulfillment_status default to support the new statuses
-- We'll keep the text type but expand the accepted values
COMMENT ON COLUMN public.orders.fulfillment_status IS 'new|accepted|picking|packed|ready|pickup_scheduled|handover|in_transit|delivered|declined|cancelled|partial_fulfilled|failed_delivery|rto|unfulfilled|partially_fulfilled|fulfilled|returned';

COMMENT ON COLUMN public.orders.payment_type IS 'cod|prepaid';
COMMENT ON COLUMN public.orders.fulfillment_type IS 'self_ship|marketplace_logistics';
