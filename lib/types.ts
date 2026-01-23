// Role is deprecated - we now use email-based admin check
// Keeping for backward compatibility during migration
export type UserRole = 'CUSTOMER' | 'ADMIN'

export interface User {
  id: string
  email: string
  created_at: string
  role?: UserRole // Optional for backward compatibility
}

export interface CustomerProfile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  brand: string | null
  category: string
  description: string | null
  image_url: string | null
  price_display: string
  price_cents?: number | null
  sale_price_cents?: number | null
  in_stock: boolean
  inventory_qty?: number | null
  is_active?: boolean
  is_featured?: boolean
  sku: string | null
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  sort_order: number
  storage_path?: string | null
  created_at: string
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  qty: number
  created_at: string
  product?: Product
}

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELED'

export interface Order {
  id: string
  user_id: string
  status: OrderStatus
  created_at: string
  delivery_address_snapshot: {
    line1: string
    line2?: string
    city: string
    state: string
    zip: string
  } | null
  phone_snapshot: string | null
  notes: string | null
  total_items: number
  sheet_sync_failed: boolean
  sheet_sync_error: string | null
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name_snapshot: string
  price_display_snapshot: string
  qty: number
  created_at: string
  product?: Product
}
