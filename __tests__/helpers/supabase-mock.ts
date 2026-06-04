import { vi } from 'vitest'

export class RedirectError extends Error {
  url: string
  constructor(url: string) {
    super(`REDIRECT: ${url}`)
    this.url = url
  }
}

/**
 * Creates a chainable mock that mimics the Supabase query builder.
 * Returns configurable data for the terminal call (.single() or awaiting the chain).
 */
export function mockQueryChain(steps: { data?: unknown; error?: unknown } = {}) {
  const result = { data: steps.data ?? null, error: steps.error ?? null }
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'neq', 'in', 'not', 'order', 'insert', 'update', 'delete', 'upsert']

  for (const method of methods) {
    chain[method] = vi.fn(() => Object.assign(Promise.resolve(result), chain))
  }
  chain.single = vi.fn(() => Promise.resolve(result))

  return chain
}
