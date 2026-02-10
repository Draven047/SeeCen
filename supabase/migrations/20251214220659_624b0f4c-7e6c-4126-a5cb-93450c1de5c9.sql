-- Add DELETE policy for customers table (admins only)
CREATE POLICY "Admins can delete customers"
ON public.customers
FOR DELETE
USING (public.is_admin(auth.uid()));