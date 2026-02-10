-- Fix RLS: Salespersons can ONLY view their own customers (not store-assigned)
DROP POLICY IF EXISTS "Users can view own or assigned store customers" ON public.customers;

CREATE POLICY "Users can view own customers or admins view all"
ON public.customers
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by OR
  is_admin(auth.uid())
);