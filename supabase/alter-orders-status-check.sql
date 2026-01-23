-- Allow additional order statuses (COMPLETED, CANCELED)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('NEW', 'CONFIRMED', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELED'));
