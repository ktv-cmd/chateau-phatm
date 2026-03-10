/**
 * Parses price_display_snapshot strings (e.g. "$12.99", "Call") from order items
 * and returns a formatted total string.
 *
 * - Items with parseable prices are summed (price × qty).
 * - Items with non-numeric prices (e.g. "Call") are counted separately.
 */
export function computeOrderTotal(
  items: Array<{ price_display_snapshot: string; qty: number }>
): string {
  if (!items || items.length === 0) return '—'

  let numericTotal = 0
  let callItemCount = 0

  for (const item of items) {
    const cleaned = item.price_display_snapshot.replace(/[$,\s]/g, '')
    const price = parseFloat(cleaned)
    if (!isNaN(price)) {
      numericTotal += price * item.qty
    } else {
      callItemCount += item.qty
    }
  }

  if (callItemCount > 0 && numericTotal === 0) {
    return 'Call for pricing'
  }

  const formattedTotal = `$${numericTotal.toFixed(2)}`

  if (callItemCount > 0) {
    return `${formattedTotal} + call items`
  }

  return formattedTotal
}
