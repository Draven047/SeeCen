-- Fix 1: Replace overly permissive customer update policy with owner-based access
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;

CREATE POLICY "Users can update own customers or admins" 
ON public.customers
FOR UPDATE TO authenticated 
USING (auth.uid() = created_by OR is_admin(auth.uid()));