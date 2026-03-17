import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { OrderDetail } from '@/components/OrderDetail'
import { OwnerOrderDetail } from '@/components/OwnerOrderDetail'
import type { Order, OrderItem } from '@/lib/types'

const refresh = vi.fn()
const back = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, back })
}))

const baseOrder: Order = {
  id: '248b0915-62d3-4ffb-926c-c98997effb66',
  user_id: '11111111-1111-1111-1111-111111111111',
  status: 'NEW',
  created_at: '2026-03-16T17:18:00.000Z',
  delivery_address_snapshot: {
    line1: '181 Amsterdam Ave',
    city: 'New York',
    state: 'NY',
    zip: '10023'
  },
  phone_snapshot: '555-111-2222',
  notes: null,
  total_items: 2,
  sheet_sync_failed: false,
  sheet_sync_error: null,
  updated_at: '2026-03-16T17:18:00.000Z'
}

const orderItems: OrderItem[] = [
  {
    id: 'aaaaaaa1-1111-1111-1111-111111111111',
    order_id: baseOrder.id,
    product_id: 'bbbbbbb1-1111-1111-1111-111111111111',
    product_name_snapshot: 'Advil Dual Action Tablets 250-125 mg (18 Count)',
    product_sku_snapshot: '5577358',
    price_display_snapshot: '$8.99',
    qty: 1,
    created_at: '2026-03-16T17:18:00.000Z'
  },
  {
    id: 'aaaaaaa2-1111-1111-1111-111111111111',
    order_id: baseOrder.id,
    product_id: 'bbbbbbb2-1111-1111-1111-111111111111',
    product_name_snapshot: 'Acetaminophen Oral Suspension 160 mg/5 ml',
    product_sku_snapshot: null,
    price_display_snapshot: '$6.99',
    qty: 1,
    created_at: '2026-03-16T17:18:00.000Z'
  }
]

describe('Order Item ID rendering', () => {
  it('renders Item ID column and values in customer order detail', () => {
    render(<OrderDetail order={baseOrder} orderItems={orderItems} />)

    const table = screen.getByRole('table', { name: /order items/i })
    expect(within(table).getByRole('columnheader', { name: /item id/i })).toBeInTheDocument()

    expect(within(table).getByText('5577358')).toBeInTheDocument()
    expect(within(table).getByText('-')).toBeInTheDocument()
  })

  it('renders Item ID column and values in admin order detail', () => {
    render(<OwnerOrderDetail order={baseOrder} orderItems={orderItems} customerEmail="customer@chateau-demo.com" />)

    const table = screen.getByRole('table', { name: /order items/i })
    expect(within(table).getByRole('columnheader', { name: /item id/i })).toBeInTheDocument()

    expect(within(table).getByText('5577358')).toBeInTheDocument()
    expect(within(table).getByText('-')).toBeInTheDocument()
  })
})
