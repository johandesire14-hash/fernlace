ALTER TABLE public.products
  ADD COLUMN size_stock jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.products AS p
SET size_stock = COALESCE((
  SELECT jsonb_object_agg(size_entry.size, size_entry.stock)
  FROM (
    SELECT
      s.size,
      (p.quantity / cardinality(p.sizes)) + CASE
        WHEN s.position <= p.quantity % cardinality(p.sizes) THEN 1
        ELSE 0
      END AS stock
    FROM unnest(p.sizes) WITH ORDINALITY AS s(size, position)
  ) AS size_entry
), '{}'::jsonb)
WHERE cardinality(p.sizes) > 0;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_required_check CHECK (btrim(category) <> '') NOT VALID,
  ADD CONSTRAINT products_sizes_required_check CHECK (cardinality(sizes) > 0) NOT VALID,
  ADD CONSTRAINT products_size_stock_object_check CHECK (jsonb_typeof(size_stock) = 'object');

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