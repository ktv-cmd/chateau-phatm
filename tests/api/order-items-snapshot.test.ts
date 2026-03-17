import { describe, expect, it, vi } from 'vitest'
import { createOrderItems, getOrderItems } from '@/lib/db/orders'

describe('order item SKU snapshot persistence', () => {
  it('passes product_sku_snapshot when creating order items', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })
    const supabase = { from } as any

    const items = [
      {
        order_id: '248b0915-62d3-4ffb-926c-c98997effb66',
        product_id: '1e878461-3a25-488b-8f78-c742a0279868',
        product_name_snapshot: 'Allegra 24-Hour Tablets 180 mg Non-Drowsy (30 Count)',
        product_sku_snapshot: '4330619',
        price_display_snapshot: '$34.95',
        qty: 1
      }
    ]

    const result = await createOrderItems(supabase, items as any)

    expect(from).toHaveBeenCalledWith('order_items')
    expect(insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          product_sku_snapshot: '4330619'
        })
      ])
    )
    expect(result.error).toBeNull()
  })

  it('returns product_sku_snapshot from order item queries', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        {
          id: '8a62e4e3-abda-4762-863d-a9bf525e9fb4',
          order_id: '248b0915-62d3-4ffb-926c-c98997effb66',
          product_id: '1e878461-3a25-488b-8f78-c742a0279868',
          product_name_snapshot: 'Allegra 24-Hour Tablets 180 mg Non-Drowsy (30 Count)',
          product_sku_snapshot: '4330619',
          price_display_snapshot: '$34.95',
          qty: 1,
          created_at: '2026-03-16T17:18:00.000Z'
        }
      ],
      error: null
    })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    const supabase = { from } as any

    const result = await getOrderItems(supabase, '248b0915-62d3-4ffb-926c-c98997effb66')

    expect(from).toHaveBeenCalledWith('order_items')
    expect(select).toHaveBeenCalledWith('*')
    expect(eq).toHaveBeenCalledWith('order_id', '248b0915-62d3-4ffb-926c-c98997effb66')
    expect(result.error).toBeNull()
    expect(result.data[0].product_sku_snapshot).toBe('4330619')
  })
})
