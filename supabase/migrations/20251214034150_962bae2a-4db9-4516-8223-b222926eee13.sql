-- Fume Points Settings Table
CREATE TABLE public.fume_points_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  points_per_amount integer NOT NULL DEFAULT 100, -- ₹ per 1 point
  point_value numeric NOT NULL DEFAULT 1, -- ₹ value per point
  min_redeem_points integer NOT NULL DEFAULT 100,
  expiry_months integer, -- NULL = no expiry
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Fume Points Ledger Table
CREATE TABLE public.fume_points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  points integer NOT NULL,
  type text NOT NULL CHECK (type IN ('earn', 'redeem', 'manual_add', 'manual_deduct', 'expired', 'refund_reverse')),
  reason text,
  order_id uuid REFERENCES public.orders(id),
  created_by uuid,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add fume_points_balance to customers
ALTER TABLE public.customers ADD COLUMN fume_points_balance integer NOT NULL DEFAULT 0;

-- Add fume_points_redeemed to orders for tracking redemptions
ALTER TABLE public.orders ADD COLUMN fume_points_redeemed integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN fume_points_earned integer NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.fume_points_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fume_points_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fume_points_settings
CREATE POLICY "Admins can manage settings"
ON public.fume_points_settings
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "All authenticated can view settings"
ON public.fume_points_settings
FOR SELECT
USING (true);

-- RLS Policies for fume_points_ledger
CREATE POLICY "Admins can manage ledger"
ON public.fume_points_ledger
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view ledger"
ON public.fume_points_ledger
FOR SELECT
USING (true);

CREATE POLICY "Sales can create ledger entries"
ON public.fume_points_ledger
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Insert default settings
INSERT INTO public.fume_points_settings (points_per_amount, point_value, min_redeem_points, expiry_months, is_active)
VALUES (100, 1, 100, NULL, true);

-- Create trigger for updated_at
CREATE TRIGGER update_fume_points_settings_updated_at
BEFORE UPDATE ON public.fume_points_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();