ALTER TABLE public.products
  ADD COLUMN compare_at_price numeric(10,2),
  ADD COLUMN status text NOT NULL DEFAULT 'Actif';

ALTER TABLE public.products
  ADD CONSTRAINT products_status_check CHECK (status IN ('Actif', 'Brouillon')),
  ADD CONSTRAINT products_compare_at_price_check CHECK (compare_at_price IS NULL OR compare_at_price >= price);

DROP POLICY "anyone reads products" ON public.products;
CREATE POLICY "active products are public" ON public.products
  FOR SELECT TO anon, authenticated
  USING (status = 'Actif' OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin inserts categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates categories" ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes categories" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'En attente',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('En attente', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée'));
CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);

CREATE OR REPLACE FUNCTION public.submit_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_items jsonb,
  p_stock jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_total numeric(10,2) := 0;
  v_order_id uuid;
  v_product_id uuid;
  v_quantity integer;
BEGIN
  IF char_length(trim(p_customer_name)) < 2 OR char_length(trim(p_customer_name)) > 100
    OR char_length(trim(p_phone)) < 6 OR char_length(trim(p_phone)) > 30
    OR char_length(trim(p_address)) < 5 OR char_length(trim(p_address)) > 250
    OR char_length(trim(p_city)) < 2 OR char_length(trim(p_city)) > 100 THEN
    RAISE EXCEPTION 'Coordonnées de livraison invalides';
  END IF;
  IF jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Panier invalide';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_total := v_total + (v_item->>'price')::numeric * (v_item->>'quantity')::integer;
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_stock)
  LOOP
    v_product_id := (v_item->>'id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    UPDATE public.products
      SET quantity = quantity - v_quantity
      WHERE id = v_product_id AND status = 'Actif' AND quantity >= v_quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuffisant pour un produit';
    END IF;
  END LOOP;

  INSERT INTO public.orders (customer_name, phone, address, city, items, total, status)
  VALUES (trim(p_customer_name), trim(p_phone), trim(p_address), trim(p_city), p_items, v_total, 'En attente')
  RETURNING id INTO v_order_id;
  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_order(text, text, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_order(text, text, text, text, jsonb, jsonb) TO service_role;