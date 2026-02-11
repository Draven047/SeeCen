
-- Channel accounts table
CREATE TABLE public.channel_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_type text NOT NULL,
  channel_name text NOT NULL,
  store_id uuid REFERENCES public.stores(id),
  is_active boolean NOT NULL DEFAULT false,
  credentials jsonb DEFAULT '{}'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  last_sync_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Channel sync logs
CREATE TABLE public.channel_sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_account_id uuid NOT NULL REFERENCES public.channel_accounts(id) ON DELETE CASCADE,
  sync_type text NOT NULL DEFAULT 'pull_orders',
  status text NOT NULL DEFAULT 'success',
  records_processed integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- SKU mappings
CREATE TABLE public.sku_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_account_id uuid NOT NULL REFERENCES public.channel_accounts(id) ON DELETE CASCADE,
  internal_product_id uuid REFERENCES public.products(id),
  internal_variant_id uuid REFERENCES public.product_variants(id),
  internal_cigar_id uuid REFERENCES public.cigars(id),
  external_sku text NOT NULL,
  external_product_id text,
  external_product_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.channel_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku_mappings ENABLE ROW LEVEL SECURITY;

-- Channel accounts policies
CREATE POLICY "Admins can manage channel accounts"
  ON public.channel_accounts FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view channel accounts"
  ON public.channel_accounts FOR SELECT
  USING (true);

-- Sync logs policies
CREATE POLICY "Admins can manage sync logs"
  ON public.channel_sync_logs FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view sync logs"
  ON public.channel_sync_logs FOR SELECT
  USING (true);

CREATE POLICY "System can create sync logs"
  ON public.channel_sync_logs FOR INSERT
  WITH CHECK (true);

-- SKU mappings policies
CREATE POLICY "Admins and ops can manage sku mappings"
  ON public.sku_mappings FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role));

CREATE POLICY "Authenticated users can view sku mappings"
  ON public.sku_mappings FOR SELECT
  USING (true);

-- Triggers
CREATE TRIGGER update_channel_accounts_updated_at
  BEFORE UPDATE ON public.channel_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sku_mappings_updated_at
  BEFORE UPDATE ON public.sku_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
