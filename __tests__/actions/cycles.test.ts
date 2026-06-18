import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockQueryChain, RedirectError } from '../helpers/supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new RedirectError(url) }),
}))

const mockAdminFrom = vi.fn()
const mockAdminClient = { from: mockAdminFrom }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ from: vi.fn() })),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

const mockRequireCycleAccess = vi.fn()
const mockRequireAdminOrManager = vi.fn()
vi.mock('@/actions/auth', () => ({
  requireCycleAccess: (...args: unknown[]) => mockRequireCycleAccess(...args),
  requireAdminOrManager: () => mockRequireAdminOrManager(),
}))

import { transitionCycle } from '@/actions/cycles'

describe('transitionCycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCycleAccess.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      cycle: { id: 'cycle-1', status: 'draft', created_by: 'admin-1' },
    })
    mockAdminFrom.mockImplementation(() => mockQueryChain({ data: null, error: null }))
  })

  it('transitions draft → active', async () => {
    const result = await transitionCycle('cycle-1', 'draft')
    expect(result).toBe('active')
  })

  it('transitions active → closed', async () => {
    const result = await transitionCycle('cycle-1', 'active')
    expect(result).toBe('closed')
  })

  it('transitions closed → results_published', async () => {
    const result = await transitionCycle('cycle-1', 'closed')
    expect(result).toBe('results_published')
  })

  it('rejects transition from results_published', async () => {
    await expect(
      transitionCycle('cycle-1', 'results_published')
    ).rejects.toThrow('Cannot transition from results_published')
  })

  it('rejects transition from invalid status', async () => {
    await expect(
      transitionCycle('cycle-1', 'nonexistent' as never)
    ).rejects.toThrow('Cannot transition from nonexistent')
  })

  it('calls requireCycleAccess with cycleId', async () => {
    await transitionCycle('cycle-1', 'draft')
    expect(mockRequireCycleAccess).toHaveBeenCalledWith('cycle-1')
  })
})
