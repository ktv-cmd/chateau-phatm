-- Persist external item ID (Excel Item Number / product SKU) per ordered line item.
-- This preserves what was ordered even if the product record changes later.
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS product_sku_snapshot TEXT;
