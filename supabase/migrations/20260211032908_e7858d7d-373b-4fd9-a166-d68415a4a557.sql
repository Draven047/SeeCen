
-- Shipments table
CREATE TABLE public.shipments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  store_id uuid REFERENCES public.stores(id),
  provider_name text NOT NULL DEFAULT 'porter_mock',
  tracking_id text NOT NULL,
  status text NOT NULL DEFAULT 'pickup_scheduled',
  pickup_address text,
  pickup_scheduled_at timestamp with time zone,
  estimated_delivery_at timestamp with time zone,
  quote_amount numeric NOT NULL DEFAULT 0,
  service_type text NOT NULL DEFAULT 'standard',
  rider_name text,
  rider_phone text,
  awb_number text,
  label_url text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tracking events table
CREATE TABLE public.shipment_tracking_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status text NOT NULL,
  description text,
  location text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;

-- Shipments policies
CREATE POLICY "Authenticated users can view shipments"
  ON public.shipments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and ops can update shipments"
  ON public.shipments FOR UPDATE
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Tracking events policies
CREATE POLICY "Authenticated users can view tracking events"
  ON public.shipment_tracking_events FOR SELECT
  USING (true);

CREATE POLICY "System can create tracking events"
  ON public.shipment_tracking_events FOR INSERT
  WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
