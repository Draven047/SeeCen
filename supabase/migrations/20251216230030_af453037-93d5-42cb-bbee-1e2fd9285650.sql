-- Drop existing foreign keys and recreate with ON DELETE CASCADE
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;

ALTER TABLE public.orders
ADD CONSTRAINT orders_customer_id_fkey
FOREIGN KEY (customer_id)
REFERENCES public.customers(id)
ON DELETE CASCADE;

ALTER TABLE public.fume_points_ledger
DROP CONSTRAINT IF EXISTS fume_points_ledger_customer_id_fkey;

ALTER TABLE public.fume_points_ledger
ADD CONSTRAINT fume_points_ledger_customer_id_fkey
FOREIGN KEY (customer_id)
REFERENCES public.customers(id)
ON DELETE CASCADE;