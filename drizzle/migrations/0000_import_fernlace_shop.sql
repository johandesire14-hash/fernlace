CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_admin AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_first_admin();

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Basses',
  price numeric(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  sizes text[] NOT NULL DEFAULT '{}',
  colors text[] NOT NULL DEFAULT '{}',
  images text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin inserts" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anyone reads product images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'product-images');
CREATE POLICY "admin uploads product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.products
  ADD COLUMN compare_at_price numeric(10,2),
  ADD COLUMN status text NOT NULL DEFAULT 'Actif',
  ADD COLUMN size_stock jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.products
  ADD CONSTRAINT products_status_check CHECK (status IN ('Actif', 'Brouillon')),
  ADD CONSTRAINT products_compare_at_price_check CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  ADD CONSTRAINT products_category_required_check CHECK (btrim(category) <> '') NOT VALID,
  ADD CONSTRAINT products_sizes_required_check CHECK (cardinality(sizes) > 0) NOT VALID,
  ADD CONSTRAINT products_size_stock_object_check CHECK (jsonb_typeof(size_stock) = 'object');

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

CREATE OR REPLACE FUNCTION public.sync_product_size_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_size text;
  v_value jsonb;
  v_total integer := 0;
BEGIN
  IF NEW.category IS NULL OR btrim(NEW.category) = '' THEN
    RAISE EXCEPTION 'Choisissez une catégorie pour ce produit';
  END IF;
  IF cardinality(NEW.sizes) = 0 THEN
    RAISE EXCEPTION 'Ajoutez au moins une pointure';
  END IF;
  IF jsonb_typeof(NEW.size_stock) IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(NEW.size_stock)) <> cardinality(NEW.sizes)
    OR EXISTS (SELECT 1 FROM unnest(NEW.sizes) AS s(size) WHERE NOT NEW.size_stock ? s.size) THEN
    RAISE EXCEPTION 'Renseignez le stock de chaque pointure';
  END IF;

  FOREACH v_size IN ARRAY NEW.sizes
  LOOP
    v_value := NEW.size_stock -> v_size;
    IF jsonb_typeof(v_value) IS DISTINCT FROM 'number'
      OR (v_value #>> '{}')::numeric < 0
      OR (v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric) THEN
      RAISE EXCEPTION 'Le stock de la pointure % doit être un nombre entier positif', v_size;
    END IF;
    v_total := v_total + (v_value #>> '{}')::integer;
  END LOOP;

  NEW.quantity := v_total;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_sync_size_stock
BEFORE INSERT OR UPDATE OF sizes, size_stock ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_product_size_stock();

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
  v_size text;
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
    v_size := v_item->>'size';
    v_quantity := (v_item->>'quantity')::integer;
    UPDATE public.products
      SET size_stock = jsonb_set(
        size_stock,
        ARRAY[v_size],
        to_jsonb((size_stock ->> v_size)::integer - v_quantity),
        false
      )
      WHERE id = v_product_id
        AND status = 'Actif'
        AND v_size IS NOT NULL
        AND size_stock ? v_size
        AND (size_stock ->> v_size)::integer >= v_quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuffisant pour la pointure demandée';
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
REVOKE EXECUTE ON FUNCTION public.handle_first_admin() FROM PUBLIC, anon, authenticated;