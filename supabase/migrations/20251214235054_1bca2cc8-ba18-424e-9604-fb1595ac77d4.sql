-- Fix customers_table_exposure: Restrict customer data access to owner, admin, or same-store users
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;

CREATE POLICY "Users can view own or assigned store customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by OR
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.store_assignments sa
    WHERE sa.user_id = auth.uid()
    AND sa.store_id = customers.store_id
  )
);