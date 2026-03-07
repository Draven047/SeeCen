-- Create offers table
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'discount',
  value text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view offers"
  ON public.offers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create offers"
  ON public.offers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator or admin can update offers"
  ON public.offers FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE POLICY "Creator or admin can delete offers"
  ON public.offers FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.store_inventory;