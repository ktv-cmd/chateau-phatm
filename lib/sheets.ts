import { Order, OrderItem } from './types'

export interface SheetsWebhookPayload {
  orderId: string
  createdAt: string
  customer: {
    name: string
    email: string
    phone: string
  }
  address: {
    line1: string
    line2?: string
    city: string
    state: string
    zip: string
  }
  items: Array<{
    productId: string
    name: string
    qty: number
    price: string
  }>
  notes?: string
}

import { config } from './config'

export async function sendOrderToSheets(
  order: Order,
  orderItems: OrderItem[],
  customerEmail: string,
  customerName?: string
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = config.sheets.webhookUrl

  if (!webhookUrl || webhookUrl === 'your_webhook_url') {
    return {
      success: false,
      error: 'Google Sheets webhook URL not configured'
    }
  }

  if (!order.delivery_address_snapshot || !order.phone_snapshot) {
    return {
      success: false,
      error: 'Order missing required address or phone information'
    }
  }

  // Use provided customer name or try to extract from address, or use default
  let finalCustomerName = customerName
  if (!finalCustomerName && order.delivery_address_snapshot.line1) {
    const addressParts = order.delivery_address_snapshot.line1.split(' ')
    finalCustomerName = addressParts.length > 1 
      ? `${addressParts[0]} ${addressParts[1]}` 
      : 'Customer'
  }
  if (!finalCustomerName) {
    finalCustomerName = 'Customer'
  }

  const payload: SheetsWebhookPayload = {
    orderId: order.id,
    createdAt: new Date(order.created_at).toISOString(),
    customer: {
      name: finalCustomerName,
      email: customerEmail,
      phone: order.phone_snapshot
    },
    address: {
      line1: order.delivery_address_snapshot.line1,
      line2: order.delivery_address_snapshot.line2 || undefined,
      city: order.delivery_address_snapshot.city,
      state: order.delivery_address_snapshot.state,
      zip: order.delivery_address_snapshot.zip
    },
    items: orderItems.map(item => ({
      productId: item.product_id,
      name: item.product_name_snapshot,
      qty: item.qty,
      price: item.price_display_snapshot
    })),
    notes: order.notes || undefined
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Webhook request failed: ${response.status} ${errorText}`
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
