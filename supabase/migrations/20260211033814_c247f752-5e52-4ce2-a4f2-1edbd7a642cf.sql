
-- Store bank details & invoice settings
CREATE TABLE public.store_finance_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  bank_name text,
  account_number text,
  ifsc_code text,
  account_holder text,
  upi_id text,
  invoice_footer text,
  terms_and_conditions text,
  gstin text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Settlements / payouts (channel-wise mock)
CREATE TABLE public.settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES public.stores(id),
  channel text NOT NULL DEFAULT 'in_store',
  settlement_date date NOT NULL DEFAULT CURRENT_DATE,
  gross_amount numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  shipping_deduction numeric NOT NULL DEFAULT 0,
  tds numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  reference_number text,
  status text NOT NULL DEFAULT 'pending',
  orders_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- COD reconciliation ledger
CREATE TABLE public.cod_reconciliation (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  store_id uuid REFERENCES public.stores(id),
  expected_amount numeric NOT NULL DEFAULT 0,
  collected_amount numeric NOT NULL DEFAULT 0,
  remitted_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  remittance_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cod_reconciliation ENABLE ROW LEVEL SECURITY;

-- Finance settings: admin/finance only
CREATE POLICY "Admins and finance can manage finance settings"
  ON public.store_finance_settings FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Authenticated users can view finance settings"
  ON public.store_finance_settings FOR SELECT
  USING (true);

-- Settlements: admin/finance
CREATE POLICY "Admins and finance can manage settlements"
  ON public.settlements FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Authenticated users can view settlements"
  ON public.settlements FOR SELECT
  USING (true);

-- COD reconciliation
CREATE POLICY "Admins and finance can manage cod reconciliation"
  ON public.cod_reconciliation FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Authenticated users can view cod reconciliation"
  ON public.cod_reconciliation FOR SELECT
  USING (true);

-- Triggers
CREATE TRIGGER update_store_finance_settings_updated_at
  BEFORE UPDATE ON public.store_finance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cod_reconciliation_updated_at
  BEFORE UPDATE ON public.cod_reconciliation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
