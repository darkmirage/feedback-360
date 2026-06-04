import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockQueryChain, RedirectError } from '../helpers/supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new RedirectError(url) }),
}))

const mockServerFrom = vi.fn()
const mockServerClient = { from: mockServerFrom }
const mockAdminFrom = vi.fn()
const mockAdminClient = { from: mockAdminFrom }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockServerClient)),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

const mockRequireAdmin = vi.fn()
const mockRequireAuth = vi.fn()
vi.mock('@/actions/auth', () => ({
  requireAdmin: () => mockRequireAdmin(),
  requireAuth: () => mockRequireAuth(),
}))

import { createAssignment } from '@/actions/assignments'

describe('createAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com', role: 'admin' })
    mockServerFrom.mockImplementation(() =>
      mockQueryChain({ data: null, error: null })
    )
  })

  it('lowercases and trims emails', async () => {
    await createAssignment({
      review_cycle_id: 'cycle-1',
      reviewer_email: '  Alice@Test.Com  ',
      subject_email: ' BOB@TEST.COM ',
      relationship: 'peer',
    })

    expect(mockServerFrom).toHaveBeenCalledWith('review_assignments')
    const fromCall = mockServerFrom.mock.results[0].value
    const insertCall = fromCall.insert.mock.calls[0][0]
    expect(insertCall.reviewer_email).toBe('alice@test.com')
    expect(insertCall.subject_email).toBe('bob@test.com')
  })
})
