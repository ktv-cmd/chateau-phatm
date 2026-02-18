-- Add user-friendly display name column
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_display_name ON public.products(display_name);

COMMENT ON COLUMN public.products.display_name IS 'User-friendly product name for customers (e.g., "Advil Pain Relief Tablets 200mg")';
