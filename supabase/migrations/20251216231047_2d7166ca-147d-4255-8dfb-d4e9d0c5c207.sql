-- Add historical import fields to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS imported_order_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS imported_total_spent numeric NOT NULL DEFAULT 0;