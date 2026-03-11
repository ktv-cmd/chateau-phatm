import { expect, afterEach, vi } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'

expect.extend(matchers)
afterEach(() => cleanup())

// Shim Jest timer API so React 18's act() can flush its scheduler when
// Vitest fake timers are active (React checks for jest.advanceTimersByTime).
Object.defineProperty(globalThis, 'jest', {
  value: {
    advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
    getTimerCount: () => vi.getTimerCount(),
    runAllTimers: () => vi.runAllTimers(),
    useFakeTimers: () => vi.useFakeTimers(),
    useRealTimers: () => vi.useRealTimers(),
  },
  writable: true,
  configurable: true,
})
