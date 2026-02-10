-- Add is_blacklisted column to customers table
ALTER TABLE public.customers ADD COLUMN is_blacklisted boolean NOT NULL DEFAULT false;

-- Add index for faster blacklist filtering
CREATE INDEX idx_customers_blacklisted ON public.customers(is_blacklisted);

-- Update RLS policy to allow admins to update any customer (for blacklisting)
DROP POLICY IF EXISTS "Users can update own customers or admins" ON public.customers;
CREATE POLICY "Users can update own customers or admins" ON public.customers
FOR UPDATE USING ((auth.uid() = created_by) OR is_admin(auth.uid()));