
-- Create return_requests table for Returns & Exchanges workflow
CREATE TABLE public.return_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  store_id UUID REFERENCES public.stores(id),
  customer_id UUID REFERENCES public.customers(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  return_type TEXT NOT NULL DEFAULT 'return' CHECK (return_type IN ('return', 'exchange')),
  reason TEXT NOT NULL,
  notes TEXT,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  restock_items BOOLEAN NOT NULL DEFAULT true,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Return request items
CREATE TABLE public.return_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id),
  cigar_id UUID REFERENCES public.cigars(id),
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_request_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for return_requests
CREATE POLICY "Users can view own return requests" ON public.return_requests
  FOR SELECT USING (auth.uid() = created_by OR is_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role));

CREATE POLICY "Authenticated users can create return requests" ON public.return_requests
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and ops can update return requests" ON public.return_requests
  FOR UPDATE USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS policies for return_request_items
CREATE POLICY "Users can view return request items" ON public.return_request_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.return_requests rr WHERE rr.id = return_request_items.return_request_id
    AND (rr.created_by = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(), 'operations'::app_role))
  ));

CREATE POLICY "Authenticated users can create return request items" ON public.return_request_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.return_requests rr WHERE rr.id = return_request_items.return_request_id
    AND rr.created_by = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_return_requests_updated_at
  BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
