ALTER TABLE public.orders
  ADD COLUMN tracking_latitude double precision,
  ADD COLUMN tracking_longitude double precision,
  ADD COLUMN tracking_updated_at timestamptz;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_tracking_latitude_check
    CHECK (tracking_latitude IS NULL OR tracking_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT orders_tracking_longitude_check
    CHECK (tracking_longitude IS NULL OR tracking_longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT orders_tracking_coordinates_pair_check
    CHECK ((tracking_latitude IS NULL) = (tracking_longitude IS NULL));
