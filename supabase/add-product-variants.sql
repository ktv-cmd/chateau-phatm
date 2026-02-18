-- Add variant fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS base_product_name TEXT,
ADD COLUMN IF NOT EXISTS variant_size TEXT;

-- Create index for better performance when grouping
CREATE INDEX IF NOT EXISTS idx_products_base_name ON public.products(base_product_name);

-- Comment the columns
COMMENT ON COLUMN public.products.base_product_name IS 'Base product name without size/quantity (e.g., "ADVIL TB 200MG")';
COMMENT ON COLUMN public.products.variant_size IS 'Size or quantity variant (e.g., "24", "100", "4OZ")';
