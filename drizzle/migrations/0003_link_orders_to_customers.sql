ALTER TABLE public.orders
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX orders_user_id_created_at_idx
  ON public.orders (user_id, created_at DESC);

CREATE POLICY "customers read own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.submit_order_for_user(
  p_user_id uuid,
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
  v_order_id uuid;
BEGIN
  v_order_id := public.submit_order(
    p_customer_name,
    p_phone,
    p_address,
    p_city,
    p_items,
    p_stock
  );

  UPDATE public.orders
  SET user_id = p_user_id
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_order_for_user(uuid, text, text, text, text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_order_for_user(uuid, text, text, text, text, jsonb, jsonb)
  TO service_role;
