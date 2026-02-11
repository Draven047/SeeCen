
-- Add invoice configuration fields to store_finance_settings
ALTER TABLE public.store_finance_settings
ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'tax_invoice',
ADD COLUMN IF NOT EXISTS return_policy text,
ADD COLUMN IF NOT EXISTS footer_notes text;
