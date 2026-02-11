
-- Add payment_status column to orders table
ALTER TABLE public.orders
ADD COLUMN payment_status text NOT NULL DEFAULT 'none';

-- Add payment_failed_at timestamp
ALTER TABLE public.orders
ADD COLUMN payment_failed_at timestamp with time zone DEFAULT NULL;

-- Add payment_confirmed_at timestamp
ALTER TABLE public.orders
ADD COLUMN payment_confirmed_at timestamp with time zone DEFAULT NULL;

-- Add payment_failure_reason column
ALTER TABLE public.orders
ADD COLUMN payment_failure_reason text DEFAULT NULL;

-- Add index for payment_status queries
CREATE INDEX idx_orders_payment_status ON public.orders (payment_status);
