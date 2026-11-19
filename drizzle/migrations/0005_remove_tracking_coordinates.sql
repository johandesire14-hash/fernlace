ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_tracking_coordinates_pair_check,
  DROP CONSTRAINT IF EXISTS orders_tracking_latitude_check,
  DROP CONSTRAINT IF EXISTS orders_tracking_longitude_check,
  DROP COLUMN IF EXISTS tracking_latitude,
  DROP COLUMN IF EXISTS tracking_longitude,
  DROP COLUMN IF EXISTS tracking_updated_at;
