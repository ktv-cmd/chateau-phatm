import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductsList } from '@/components/ProductsList'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams()
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>
}))

vi.mock('@/lib/db/supabaseClient', () => ({
  supabaseClient: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } })
    }
  }
}))

describe('ProductsList', () => {
  beforeEach(() => {
    push.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
  })

  it('shows safety banner when warnings returned', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [{ type: 'product', value: 'Tylenol Extra Strength 500mg Tablets' }],
        safety: { warnings: [{ code: 'pediatric-dosage-exceeded', message: 'Dose too high', severity: 'warning' }] }
      })
    }))

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ProductsList products={[]} categories={['Pain Relief']} searchQuery="" />)

    const input = screen.getByLabelText('Search products')
    await user.type(input, 'kids tylenol 500mg')

    vi.advanceTimersByTime(250)

    await waitFor(() => expect(screen.getByText('Safety notice')).toBeInTheDocument())
    await user.click(screen.getByText('Dismiss'))

    expect(screen.queryByText('Safety notice')).not.toBeInTheDocument()

    render(<ProductsList products={[]} categories={['Pain Relief']} searchQuery="" />)
    expect(screen.queryByText('Safety notice')).not.toBeInTheDocument()
  })

  it('renders empty state with category CTAs', () => {
    render(<ProductsList products={[]} categories={['Pain Relief', 'Allergy']} searchQuery="" />)
    expect(screen.getByText('No products found.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pain Relief' })).toBeInTheDocument()
  })

  it('shows loading and error states for autocomplete', async () => {
    let resolveFetch: (value: any) => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(fetchPromise))

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ProductsList products={[]} categories={['Pain Relief']} searchQuery="" />)

    await user.type(screen.getByLabelText('Search products'), 'ty')
    vi.advanceTimersByTime(250)

    expect(screen.getByText('Loading...')).toBeInTheDocument()

    resolveFetch!({
      ok: false,
      json: async () => ({})
    })

    await waitFor(() => expect(screen.getByText('Unable to load suggestions.')).toBeInTheDocument())
  })
})
