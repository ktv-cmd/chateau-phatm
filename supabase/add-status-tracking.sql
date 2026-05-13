-- =====================================================================
-- Migration: Employee name tracking + Order status audit log
-- Run this in the Supabase SQL editor
-- =====================================================================

-- 1. Add name fields to users table (for employees)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 2. Ensure role column exists (already in schema.sql, but safe to repeat)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'CUSTOMER';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('CUSTOMER', 'ADMIN'));

-- 3. Who last updated each order
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_by_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_by_email TEXT;

-- 4. Full immutable audit log of every status change
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  updated_by_name TEXT NOT NULL,
  updated_by_email TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_history_updated_at ON public.order_status_history(updated_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.order_status_history TO authenticated;

DROP POLICY IF EXISTS "Admins can view history" ON public.order_status_history;
CREATE POLICY "Admins can view history"
  ON public.order_status_history FOR SELECT
  USING (public.is_owner());

-- 5. Update handle_new_user trigger:
--    - auto-promotes @chateau.com emails to ADMIN
--    - captures first_name and last_name from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF NEW.email ILIKE '%@chateau.com' OR NEW.email = 'admin@chateau-demo.com' THEN
    v_role := 'ADMIN';
  ELSE
    v_role := 'CUSTOMER';
  END IF;

  INSERT INTO public.users (id, email, role, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    v_role,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name  = EXCLUDED.last_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Also update is_owner() to match the new role-based approach
--    (already correct in schema.sql — included here for completeness)
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

-- 7. Backfill: promote existing admin@chateau-demo.com to ADMIN if not already
UPDATE public.users
SET role = 'ADMIN'
WHERE email = 'admin@chateau-demo.com' AND role != 'ADMIN';
