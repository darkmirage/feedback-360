import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockQueryChain, RedirectError } from '../helpers/supabase-mock'

// Mock next modules
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new RedirectError(url) }),
}))

// Mock Supabase clients
const mockAdminFrom = vi.fn()
const mockAdminClient = { from: mockAdminFrom }

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

// Mock auth
const mockRequireAuth = vi.fn()
vi.mock('@/actions/auth', () => ({
  requireAuth: () => mockRequireAuth(),
}))

import { getResultsForSubject, getAllSubjectResults } from '@/actions/results'

describe('getResultsForSubject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupAdminQueries(overrides: {
    cycle?: { status: string }
    assignments?: Array<{ id: string; relationship: string; completed_at: string | null }>
    questions?: Array<{ id: string; question_text: string; question_order: number; is_open_ended: boolean; is_rating: boolean }>
    responses?: Array<{ question_id: string; open_text: string | null; rating_value: number | null }>
    subject?: { full_name: string } | null
  } = {}) {
    const cycle = overrides.cycle ?? { status: 'results_published' }
    const assignments = overrides.assignments ?? []
    const questions = overrides.questions ?? []
    const responses = overrides.responses ?? []
    const subject = overrides.subject === null ? null : (overrides.subject ?? { full_name: 'Test Subject' })

    let callCount = 0
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'review_cycles') {
        return mockQueryChain({ data: cycle })
      }
      if (table === 'review_assignments') {
        return mockQueryChain({ data: assignments })
      }
      if (table === 'questions') {
        return mockQueryChain({ data: questions })
      }
      if (table === 'responses') {
        return mockQueryChain({ data: responses })
      }
      if (table === 'users') {
        return mockQueryChain({ data: subject })
      }
      return mockQueryChain({})
    })
  }

  it('rejects non-admin, non-self user', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'user-1',
      email: 'other@test.com',
      role: 'user',
    })

    await expect(
      getResultsForSubject('cycle-1', 'subject@test.com')
    ).rejects.toThrow('You can only view your own results')
  })

  it('rejects unpublished cycle', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'user-1',
      email: 'subject@test.com',
      role: 'user',
    })
    setupAdminQueries({ cycle: { status: 'active' } })

    await expect(
      getResultsForSubject('cycle-1', 'subject@test.com')
    ).rejects.toThrow('Results are not yet published')
  })

  it('allows self to view their own results', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'user-1',
      email: 'subject@test.com',
      role: 'user',
    })
    setupAdminQueries({
      assignments: [],
      questions: [],
    })

    const result = await getResultsForSubject('cycle-1', 'subject@test.com')
    expect(result.subject_email).toBe('subject@test.com')
    expect(result.groups).toHaveLength(0)
  })

  it('always returns self-review group regardless of count', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'user-1',
      email: 'subject@test.com',
      role: 'user',
    })
    setupAdminQueries({
      assignments: [
        { id: 'a1', relationship: 'self', completed_at: '2026-01-01' },
      ],
      questions: [
        { id: 'q1', question_text: 'Strengths?', question_order: 1, is_open_ended: true, is_rating: false },
      ],
      responses: [
        { question_id: 'q1', open_text: 'I am good at X', rating_value: null },
      ],
    })

    const result = await getResultsForSubject('cycle-1', 'subject@test.com')
    const selfGroup = result.groups.find((g) => g.relationship === 'self')
    expect(selfGroup).toBeDefined()
    expect(selfGroup!.responseCount).toBe(1)
    expect(selfGroup!.questions[0].openTextResponses).toContain('I am good at X')
  })

  it('returns all feedback regardless of group size', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'user-1',
      email: 'subject@test.com',
      role: 'user',
    })
    setupAdminQueries({
      assignments: [
        { id: 'a1', relationship: 'peer', completed_at: '2026-01-01' },
        { id: 'a2', relationship: 'peer', completed_at: '2026-01-01' },
        { id: 'a3', relationship: 'peer', completed_at: '2026-01-01' },
      ],
      questions: [
        { id: 'q1', question_text: 'Strengths?', question_order: 1, is_open_ended: true, is_rating: true },
      ],
      responses: [
        { question_id: 'q1', open_text: 'Great leader', rating_value: 4 },
        { question_id: 'q1', open_text: 'Good communicator', rating_value: 5 },
        { question_id: 'q1', open_text: '', rating_value: 3 },
      ],
    })

    const result = await getResultsForSubject('cycle-1', 'subject@test.com')
    const peerGroup = result.groups.find((g) => g.relationship === 'peer')
    expect(peerGroup).toBeDefined()
    expect(peerGroup!.responseCount).toBe(3)
    // Empty strings should be filtered out
    expect(peerGroup!.questions[0].openTextResponses).toEqual(['Great leader', 'Good communicator'])
    // Average of 4, 5, 3 = 4.0
    expect(peerGroup!.questions[0].averageRating).toBe(4)
  })

  it('correctly rounds rating averages', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'user-1',
      email: 'subject@test.com',
      role: 'user',
    })
    setupAdminQueries({
      assignments: [
        { id: 'a1', relationship: 'peer', completed_at: '2026-01-01' },
        { id: 'a2', relationship: 'peer', completed_at: '2026-01-01' },
        { id: 'a3', relationship: 'peer', completed_at: '2026-01-01' },
      ],
      questions: [
        { id: 'q1', question_text: 'Rating?', question_order: 1, is_open_ended: false, is_rating: true },
      ],
      responses: [
        { question_id: 'q1', open_text: null, rating_value: 4 },
        { question_id: 'q1', open_text: null, rating_value: 5 },
        { question_id: 'q1', open_text: null, rating_value: 4 },
      ],
    })

    const result = await getResultsForSubject('cycle-1', 'subject@test.com')
    // Average of 4, 5, 4 = 4.333... → rounds to 4.3
    expect(peerGroup(result).questions[0].averageRating).toBe(4.3)
  })

  it('uses email as fallback for subject name', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'user-1',
      email: 'subject@test.com',
      role: 'user',
    })
    setupAdminQueries({
      assignments: [],
      questions: [],
      subject: null,
    })

    const result = await getResultsForSubject('cycle-1', 'subject@test.com')
    expect(result.subject_name).toBe('subject@test.com')
  })
})

describe('getAllSubjectResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-admin', async () => {
    mockRequireAuth.mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      role: 'user',
    })

    await expect(getAllSubjectResults('cycle-1')).rejects.toThrow('Admin only')
  })
})

// Helper
function peerGroup(result: { groups: Array<{ relationship: string; [k: string]: unknown }> }) {
  const g = result.groups.find((g) => g.relationship === 'peer')
  if (!g) throw new Error('No peer group found')
  return g as ReturnType<typeof getResultsForSubject> extends Promise<infer T> ? T['groups'][number] : never
}
