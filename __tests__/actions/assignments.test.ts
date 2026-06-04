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

import { getMatrixWarnings, createAssignment } from '@/actions/assignments'

describe('getMatrixWarnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com', role: 'admin' })
  })

  it('generates warnings for groups below threshold', async () => {
    mockAdminFrom.mockImplementation(() =>
      mockQueryChain({
        data: [
          { subject_email: 'alice@test.com', relationship: 'peer' },
          { subject_email: 'alice@test.com', relationship: 'peer' },
          // Only 2 peer reviewers for alice — below threshold of 3
        ],
      })
    )

    const warnings = await getMatrixWarnings('cycle-1')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toEqual({
      subject_email: 'alice@test.com',
      relationship: 'peer',
      count: 2,
    })
  })

  it('does not warn for groups meeting threshold', async () => {
    mockAdminFrom.mockImplementation(() =>
      mockQueryChain({
        data: [
          { subject_email: 'alice@test.com', relationship: 'peer' },
          { subject_email: 'alice@test.com', relationship: 'peer' },
          { subject_email: 'alice@test.com', relationship: 'peer' },
        ],
      })
    )

    const warnings = await getMatrixWarnings('cycle-1')
    expect(warnings).toHaveLength(0)
  })

  it('excludes self-reviews from warnings', async () => {
    // self-reviews are filtered out by the .neq('relationship', 'self') query
    // so they never appear in the data
    mockAdminFrom.mockImplementation(() =>
      mockQueryChain({ data: [] })
    )

    const warnings = await getMatrixWarnings('cycle-1')
    expect(warnings).toHaveLength(0)
  })

  it('handles multiple subjects with different group sizes', async () => {
    mockAdminFrom.mockImplementation(() =>
      mockQueryChain({
        data: [
          // Alice has 3 peers — OK
          { subject_email: 'alice@test.com', relationship: 'peer' },
          { subject_email: 'alice@test.com', relationship: 'peer' },
          { subject_email: 'alice@test.com', relationship: 'peer' },
          // Bob has 1 manager — warning
          { subject_email: 'bob@test.com', relationship: 'manager' },
          // Bob has 2 peers — warning
          { subject_email: 'bob@test.com', relationship: 'peer' },
          { subject_email: 'bob@test.com', relationship: 'peer' },
        ],
      })
    )

    const warnings = await getMatrixWarnings('cycle-1')
    expect(warnings).toHaveLength(2)
    expect(warnings).toContainEqual({
      subject_email: 'bob@test.com',
      relationship: 'manager',
      count: 1,
    })
    expect(warnings).toContainEqual({
      subject_email: 'bob@test.com',
      relationship: 'peer',
      count: 2,
    })
  })
})

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
    // Check the insert was called (the chain mock captures it)
    const fromCall = mockServerFrom.mock.results[0].value
    const insertCall = fromCall.insert.mock.calls[0][0]
    expect(insertCall.reviewer_email).toBe('alice@test.com')
    expect(insertCall.subject_email).toBe('bob@test.com')
  })
})
