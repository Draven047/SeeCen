
-- 1. customers: scope SELECT to admin, creator, or store-assigned users
DROP POLICY IF EXISTS "All authenticated can view customers" ON public.customers;
CREATE POLICY "Users can view scoped customers"
ON public.customers FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (store_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.store_assignments sa
    WHERE sa.user_id = auth.uid() AND sa.store_id = customers.store_id
  ))
);

-- 2. store_finance_settings: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view finance settings" ON public.store_finance_settings;
CREATE POLICY "Scoped users can view finance settings"
ON public.store_finance_settings FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'finance'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.store_assignments sa
    WHERE sa.user_id = auth.uid() AND sa.store_id = store_finance_settings.store_id
  )
);

-- 3. channel_accounts: scope manager/operations to assigned store
DROP POLICY IF EXISTS "Admin and operations can view channel accounts" ON public.channel_accounts;
CREATE POLICY "Scoped users can view channel accounts"
ON public.channel_accounts FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR (
    (has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND store_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.store_assignments sa
      WHERE sa.user_id = auth.uid() AND sa.store_id = channel_accounts.store_id
    )
  )
);

-- 4. user_roles: restrict self-insert to default sales / not approved
DROP POLICY IF EXISTS "User roles insert on signup" ON public.user_roles;
CREATE POLICY "User roles default self insert on signup"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'sales'::app_role
  AND is_approved = false
);

-- 5. has_role: require is_approved
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_approved = true
  )
$$;

-- 6. notifications: remove permissive INSERT (trigger uses SECURITY DEFINER / service_role)
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- 7. finance_audit_logs: remove permissive INSERT (server-side / service_role only)
DROP POLICY IF EXISTS "System can create audit logs" ON public.finance_audit_logs;
CREATE POLICY "Admins and finance can create audit logs"
ON public.finance_audit_logs FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'finance'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
);

-- 8. shipment_tracking_events: restrict INSERT
DROP POLICY IF EXISTS "System can create tracking events" ON public.shipment_tracking_events;
CREATE POLICY "Authorized users can create tracking events"
ON public.shipment_tracking_events FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'operations'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = shipment_tracking_events.shipment_id
      AND (s.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.store_assignments sa
        WHERE sa.user_id = auth.uid() AND sa.store_id = s.store_id
      ))
  )
);

-- 9. ai_coach_daily_recommendations: restrict INSERT to own user
DROP POLICY IF EXISTS "System can insert recommendations" ON public.ai_coach_daily_recommendations;
CREATE POLICY "Users can insert own recommendations"
ON public.ai_coach_daily_recommendations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
