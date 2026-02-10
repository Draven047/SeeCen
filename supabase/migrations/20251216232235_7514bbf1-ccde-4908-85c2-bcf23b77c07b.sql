-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own customers or admins view all" ON public.customers;

-- Create new policy allowing all authenticated users to view all customers
CREATE POLICY "All authenticated can view customers" 
ON public.customers 
FOR SELECT 
USING (true);