-- Add stores table
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Stores policies
CREATE POLICY "Admins can manage stores" ON public.stores FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "All authenticated can view stores" ON public.stores FOR SELECT USING (true);

-- Store assignments table (employees to stores)
CREATE TABLE public.store_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)
);

ALTER TABLE public.store_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assignments" ON public.store_assignments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own assignments" ON public.store_assignments FOR SELECT USING (auth.uid() = user_id);

-- Store inventory table (per-store stock levels)
CREATE TABLE public.store_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  cigar_id UUID NOT NULL REFERENCES public.cigars(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 10,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, cigar_id)
);

ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inventory" ON public.store_inventory FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Operations can manage inventory" ON public.store_inventory FOR ALL USING (public.has_role(auth.uid(), 'operations'));
CREATE POLICY "All authenticated can view inventory" ON public.store_inventory FOR SELECT USING (true);

-- Stock request tickets
CREATE TYPE public.stock_request_status AS ENUM ('pending', 'approved', 'rejected', 'fulfilled');

CREATE TABLE public.stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  cigar_id UUID NOT NULL REFERENCES public.cigars(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  status stock_request_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can create requests" ON public.stock_requests FOR INSERT WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "Operations can manage requests" ON public.stock_requests FOR ALL USING (public.has_role(auth.uid(), 'operations') OR is_admin(auth.uid()));
CREATE POLICY "Users can view own requests" ON public.stock_requests FOR SELECT USING (auth.uid() = requested_by);

-- Add date_of_birth and phone to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Add store_id to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Purchase records table for reporting
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  cigar_id UUID NOT NULL REFERENCES public.cigars(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  supplier_name TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operations can manage purchases" ON public.purchases FOR ALL USING (public.has_role(auth.uid(), 'operations') OR is_admin(auth.uid()));
CREATE POLICY "Sales can view purchases" ON public.purchases FOR SELECT USING (public.has_role(auth.uid(), 'sales'));

-- Triggers for updated_at
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_inventory_updated_at BEFORE UPDATE ON public.store_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_requests_updated_at BEFORE UPDATE ON public.stock_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();