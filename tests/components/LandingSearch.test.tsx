import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LandingSearch } from '@/components/LandingSearch'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push })
}))

describe('LandingSearch', () => {
  beforeEach(() => {
    push.mockClear()
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          { type: 'product', value: 'Tylenol Extra Strength 500mg Tablets' },
          { type: 'category', value: 'Pain Relief' }
        ]
      })
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('opens autocomplete and navigates on selection', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<LandingSearch />)

    const input = screen.getByLabelText('Search products')
    await user.click(input)
    await user.type(input, 'ty')

    vi.advanceTimersByTime(250)

    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())
    await user.keyboard('{ArrowDown}{Enter}')

    expect(push).toHaveBeenCalledWith('/products?search=Tylenol%20Extra%20Strength%20500mg%20Tablets')
  })

  it('debounces calls while typing', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<LandingSearch />)

    const input = screen.getByLabelText('Search products')
    await user.type(input, 'tyl')

    vi.advanceTimersByTime(250)

    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
