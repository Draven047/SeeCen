
-- Add omnichannel fields to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'in_store',
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'unfulfilled',
  ADD COLUMN IF NOT EXISTS external_order_id text,
  ADD COLUMN IF NOT EXISTS external_channel_order_number text,
  ADD COLUMN IF NOT EXISTS channel_metadata jsonb;

-- Create index on channel and fulfillment_status for filtering
CREATE INDEX IF NOT EXISTS idx_orders_channel ON public.orders(channel);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON public.orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_external_order_id ON public.orders(external_order_id);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.channel IS 'Sales channel: in_store, website, instagram, whatsapp, marketplace, csv_import';
COMMENT ON COLUMN public.orders.fulfillment_status IS 'Fulfillment status: unfulfilled, partially_fulfilled, fulfilled, returned';
COMMENT ON COLUMN public.orders.external_order_id IS 'External order ID from the channel platform';
COMMENT ON COLUMN public.orders.external_channel_order_number IS 'Display order number from external channel';
COMMENT ON COLUMN public.orders.channel_metadata IS 'Additional metadata from the channel (e.g. tracking info, channel-specific fields)';
