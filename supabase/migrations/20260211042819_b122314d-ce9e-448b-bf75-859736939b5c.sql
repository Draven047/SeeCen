
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view channel accounts" ON public.channel_accounts;

-- Create a restricted SELECT policy: only admin and operations can view
CREATE POLICY "Admin and operations can view channel accounts"
  ON public.channel_accounts
  FOR SELECT
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
