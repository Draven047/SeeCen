-- Fix fume_ledger_exposure: Restrict fume points ledger visibility to relevant users only
DROP POLICY IF EXISTS "Authenticated users can view ledger" ON public.fume_points_ledger;

CREATE POLICY "Users can view relevant ledger entries"
ON public.fume_points_ledger
FOR SELECT
USING (
  is_admin(auth.uid()) OR
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.customers
    WHERE customers.id = fume_points_ledger.customer_id
    AND customers.created_by = auth.uid()
  )
);