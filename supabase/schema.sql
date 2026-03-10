-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN')),
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer profiles
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_display TEXT NOT NULL,
  price_cents INTEGER,
  sale_price_cents INTEGER,
  in_stock BOOLEAN DEFAULT true,
  inventory_qty INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sku TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product images
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart items
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONFIRMED', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_address_snapshot JSONB NOT NULL,
  phone_snapshot TEXT NOT NULL,
  notes TEXT,
  total_items INTEGER NOT NULL DEFAULT 0,
  sheet_sync_failed BOOLEAN DEFAULT false,
  sheet_sync_error TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refill requests
CREATE TABLE IF NOT EXISTS public.refill_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  refill_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name_snapshot TEXT NOT NULL,
  price_display_snapshot TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_sort ON public.product_images(sort_order);
CREATE INDEX IF NOT EXISTS idx_refill_requests_user_id ON public.refill_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refill_requests_status ON public.refill_requests(status);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refill_requests ENABLE ROW LEVEL SECURITY;

-- Base privileges for API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cart_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.order_items TO authenticated;
GRANT SELECT ON TABLE public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.refill_requests TO authenticated;

-- Owner check helper (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'ADMIN'
  );
$$;

-- Users policies
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Owners can view all users (using auth.jwt() to avoid recursion)
DROP POLICY IF EXISTS "Owners can view all users" ON public.users;
CREATE POLICY "Owners can view all users"
  ON public.users FOR SELECT
  USING (public.is_owner());

-- Customer profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.customer_profiles;
CREATE POLICY "Users can view their own profile"
  ON public.customer_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.customer_profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.customer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.customer_profiles;
CREATE POLICY "Users can update their own profile"
  ON public.customer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can view all profiles" ON public.customer_profiles;
CREATE POLICY "Owners can view all profiles"
  ON public.customer_profiles FOR SELECT
  USING (public.is_owner());

-- Products policies
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_owner());

DROP POLICY IF EXISTS "Owners can insert products" ON public.products;
CREATE POLICY "Owners can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Owners can update products" ON public.products;
CREATE POLICY "Owners can update products"
  ON public.products FOR UPDATE
  USING (public.is_owner());

DROP POLICY IF EXISTS "Owners can delete products" ON public.products;
CREATE POLICY "Owners can delete products"
  ON public.products FOR DELETE
  USING (public.is_owner());

-- Cart items policies
DROP POLICY IF EXISTS "Users can view their own cart" ON public.cart_items;
CREATE POLICY "Users can view their own cart"
  ON public.cart_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
CREATE POLICY "Users can insert their own cart items"
  ON public.cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
CREATE POLICY "Users can update their own cart items"
  ON public.cart_items FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
CREATE POLICY "Users can delete their own cart items"
  ON public.cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- Orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
CREATE POLICY "Users can insert their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can view all orders" ON public.orders;
CREATE POLICY "Owners can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_owner());

DROP POLICY IF EXISTS "Owners can update all orders" ON public.orders;
CREATE POLICY "Owners can update all orders"
  ON public.orders FOR UPDATE
  USING (public.is_owner());

-- Order items policies
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;
CREATE POLICY "Users can insert their own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can view all order items" ON public.order_items;
CREATE POLICY "Owners can view all order items"
  ON public.order_items FOR SELECT
  USING (public.is_owner());

-- Refill requests policies
DROP POLICY IF EXISTS "Users can view their own refill requests" ON public.refill_requests;
CREATE POLICY "Users can view their own refill requests"
  ON public.refill_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can view all refill requests" ON public.refill_requests;
CREATE POLICY "Owners can view all refill requests"
  ON public.refill_requests FOR SELECT
  USING (public.is_owner());

DROP POLICY IF EXISTS "Users can insert their own refill requests" ON public.refill_requests;
CREATE POLICY "Users can insert their own refill requests"
  ON public.refill_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update refill requests" ON public.refill_requests;
CREATE POLICY "Owners can update refill requests"
  ON public.refill_requests FOR UPDATE
  USING (public.is_owner());

-- Product images policies
DROP POLICY IF EXISTS "Product images are viewable by everyone" ON public.product_images;
CREATE POLICY "Product images are viewable by everyone"
  ON public.product_images FOR SELECT
  USING (
    public.is_owner()
    OR EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Owners can insert product images" ON public.product_images;
CREATE POLICY "Owners can insert product images"
  ON public.product_images FOR INSERT
  WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Owners can update product images" ON public.product_images;
CREATE POLICY "Owners can update product images"
  ON public.product_images FOR UPDATE
  USING (public.is_owner());

DROP POLICY IF EXISTS "Owners can delete product images" ON public.product_images;
CREATE POLICY "Owners can delete product images"
  ON public.product_images FOR DELETE
  USING (public.is_owner());

-- Function to automatically create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'CUSTOMER')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
