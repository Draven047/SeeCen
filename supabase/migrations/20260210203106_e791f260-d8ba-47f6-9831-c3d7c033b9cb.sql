
-- Create products table (fashion-oriented replacement for cigars)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  hsn_code TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  mrp NUMERIC,
  description TEXT,
  image_urls TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_variants table (size/color/SKU)
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT,
  size TEXT,
  color TEXT,
  barcode TEXT,
  price_override NUMERIC,
  weight_grams INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, size, color)
);

-- Add variant_id to store_inventory (nullable for backward compat)
ALTER TABLE public.store_inventory
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id),
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id);

-- Add variant_id and product_id to order_items (nullable for backward compat)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id),
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id);

-- Add variant_id to stock_requests
ALTER TABLE public.stock_requests
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id),
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id);

-- Enable RLS on new tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Products RLS: everyone can view, admin/operations can manage
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT USING (true);

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'operations'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operations'));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (is_admin(auth.uid()));

-- Product variants RLS: same pattern
CREATE POLICY "Authenticated users can view variants"
  ON public.product_variants FOR SELECT USING (true);

CREATE POLICY "Admins can insert variants"
  ON public.product_variants FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'operations'));

CREATE POLICY "Admins can update variants"
  ON public.product_variants FOR UPDATE
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operations'));

CREATE POLICY "Admins can delete variants"
  ON public.product_variants FOR DELETE
  USING (is_admin(auth.uid()));

-- Trigger for updated_at on products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast variant lookups
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_store_inventory_variant_id ON public.store_inventory(variant_id);
CREATE INDEX idx_store_inventory_product_id ON public.store_inventory(product_id);
