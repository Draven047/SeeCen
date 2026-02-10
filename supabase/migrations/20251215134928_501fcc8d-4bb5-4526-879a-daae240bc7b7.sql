-- Drop the existing restrictive DELETE policy
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;

-- Create a new PERMISSIVE DELETE policy for admins
CREATE POLICY "Admins can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));