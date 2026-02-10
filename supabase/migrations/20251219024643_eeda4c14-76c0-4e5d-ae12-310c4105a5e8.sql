-- Store tax settings
CREATE TABLE public.store_tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  state_name text NOT NULL,
  state_code text NOT NULL,
  default_cgst_rate numeric NOT NULL DEFAULT 0,
  default_sgst_rate numeric NOT NULL DEFAULT 0,
  default_igst_rate numeric NOT NULL DEFAULT 0,
  default_cess_rate numeric NOT NULL DEFAULT 0,
  cess_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

-- Invoice series for each store
CREATE TABLE public.invoice_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  prefix text NOT NULL,
  current_number integer NOT NULL DEFAULT 0,
  financial_year text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(store_id, financial_year)
);

-- Credit note series for each store
CREATE TABLE public.credit_note_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  prefix text NOT NULL,
  current_number integer NOT NULL DEFAULT 0,
  financial_year text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(store_id, financial_year)
);

-- Credit notes table
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text NOT NULL UNIQUE,
  original_order_id uuid NOT NULL REFERENCES public.orders(id),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  credit_type text NOT NULL CHECK (credit_type IN ('partial', 'full')),
  amount numeric NOT NULL DEFAULT 0,
  cgst_amount numeric NOT NULL DEFAULT 0,
  sgst_amount numeric NOT NULL DEFAULT 0,
  igst_amount numeric NOT NULL DEFAULT 0,
  cess_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  reason text NOT NULL,
  deduct_fume_points boolean NOT NULL DEFAULT false,
  points_deducted integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Finance audit logs
CREATE TABLE public.finance_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action_type text NOT NULL,
  store_id uuid REFERENCES public.stores(id),
  before_data jsonb,
  after_data jsonb,
  reason text,
  performed_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add new columns to orders table for invoice/tax details
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE,
ADD COLUMN IF NOT EXISTS invoice_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_finalized boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS finalized_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS finalized_by uuid,
ADD COLUMN IF NOT EXISTS place_of_supply_state text,
ADD COLUMN IF NOT EXISTS place_of_supply_code text,
ADD COLUMN IF NOT EXISTS cgst_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cess_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cess_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_voided boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS voided_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS voided_by uuid,
ADD COLUMN IF NOT EXISTS void_reason text,
ADD COLUMN IF NOT EXISTS invoice_snapshot jsonb;

-- Enable RLS on new tables
ALTER TABLE public.store_tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for store_tax_settings
CREATE POLICY "All authenticated can view tax settings" ON public.store_tax_settings
FOR SELECT USING (true);

CREATE POLICY "Admins can manage tax settings" ON public.store_tax_settings
FOR ALL USING (is_admin(auth.uid()));

-- RLS policies for invoice_series
CREATE POLICY "All authenticated can view invoice series" ON public.invoice_series
FOR SELECT USING (true);

CREATE POLICY "Admins can manage invoice series" ON public.invoice_series
FOR ALL USING (is_admin(auth.uid()));

-- RLS policies for credit_note_series
CREATE POLICY "All authenticated can view credit note series" ON public.credit_note_series
FOR SELECT USING (true);

CREATE POLICY "Admins can manage credit note series" ON public.credit_note_series
FOR ALL USING (is_admin(auth.uid()));

-- RLS policies for credit_notes
CREATE POLICY "All authenticated can view credit notes" ON public.credit_notes
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create credit notes" ON public.credit_notes
FOR INSERT WITH CHECK (auth.uid() = created_by);

-- RLS policies for finance_audit_logs
CREATE POLICY "Admins and operations can view audit logs" ON public.finance_audit_logs
FOR SELECT USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operations'));

CREATE POLICY "System can create audit logs" ON public.finance_audit_logs
FOR INSERT WITH CHECK (true);

-- Function to get current Indian financial year (April-March)
CREATE OR REPLACE FUNCTION public.get_current_financial_year()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  current_month integer;
  current_year integer;
  fy_start integer;
  fy_end integer;
BEGIN
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  IF current_month >= 4 THEN
    fy_start := current_year;
    fy_end := current_year + 1;
  ELSE
    fy_start := current_year - 1;
    fy_end := current_year;
  END IF;
  
  RETURN fy_start || '-' || SUBSTRING(fy_end::text FROM 3 FOR 2);
END;
$$;

-- Function to generate next invoice number for a store
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_store_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series invoice_series%ROWTYPE;
  v_fy text;
  v_next_number integer;
  v_invoice_number text;
BEGIN
  v_fy := get_current_financial_year();
  
  -- Lock and get/create the series record
  SELECT * INTO v_series
  FROM invoice_series
  WHERE store_id = p_store_id AND financial_year = v_fy
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create new series for this FY
    INSERT INTO invoice_series (store_id, prefix, current_number, financial_year)
    SELECT p_store_id, COALESCE(
      (SELECT prefix FROM invoice_series WHERE store_id = p_store_id ORDER BY created_at DESC LIMIT 1),
      'INV'
    ), 1, v_fy
    RETURNING * INTO v_series;
    
    v_next_number := 1;
  ELSE
    v_next_number := v_series.current_number + 1;
    UPDATE invoice_series
    SET current_number = v_next_number, updated_at = now()
    WHERE id = v_series.id;
  END IF;
  
  v_invoice_number := v_series.prefix || '/' || v_fy || '/' || LPAD(v_next_number::text, 6, '0');
  
  RETURN v_invoice_number;
END;
$$;

-- Function to generate next credit note number for a store
CREATE OR REPLACE FUNCTION public.generate_credit_note_number(p_store_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series credit_note_series%ROWTYPE;
  v_fy text;
  v_next_number integer;
  v_cn_number text;
BEGIN
  v_fy := get_current_financial_year();
  
  -- Lock and get/create the series record
  SELECT * INTO v_series
  FROM credit_note_series
  WHERE store_id = p_store_id AND financial_year = v_fy
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create new series for this FY
    INSERT INTO credit_note_series (store_id, prefix, current_number, financial_year)
    SELECT p_store_id, COALESCE(
      (SELECT prefix FROM credit_note_series WHERE store_id = p_store_id ORDER BY created_at DESC LIMIT 1),
      'CN'
    ), 1, v_fy
    RETURNING * INTO v_series;
    
    v_next_number := 1;
  ELSE
    v_next_number := v_series.current_number + 1;
    UPDATE credit_note_series
    SET current_number = v_next_number, updated_at = now()
    WHERE id = v_series.id;
  END IF;
  
  v_cn_number := v_series.prefix || '/' || v_fy || '/' || LPAD(v_next_number::text, 6, '0');
  
  RETURN v_cn_number;
END;
$$;

-- Trigger for updated_at on new tables
CREATE TRIGGER update_store_tax_settings_updated_at
BEFORE UPDATE ON public.store_tax_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_series_updated_at
BEFORE UPDATE ON public.invoice_series
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_note_series_updated_at
BEFORE UPDATE ON public.credit_note_series
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();