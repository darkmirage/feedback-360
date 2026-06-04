import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RedirectError } from '../helpers/supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new RedirectError(url) }),
}))

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockServerClient = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockServerClient)),
}))

import { getCurrentUser, requireAuth, requireAdmin } from '@/actions/auth'

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when no auth user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await getCurrentUser()
    expect(result).toBeNull()
  })

  it('returns profile when authenticated', async () => {
    const profile = { id: 'user-1', email: 'test@test.com', full_name: 'Test User', role: 'user' }
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    // Mock the .from('users').select('*').eq('id', ...).single() chain
    const singleMock = vi.fn(() => Promise.resolve({ data: profile, error: null }))
    const eqMock = vi.fn(() => ({ single: singleMock }))
    const selectMock = vi.fn(() => ({ eq: eqMock }))
    mockFrom.mockReturnValue({ select: selectMock })

    const result = await getCurrentUser()
    expect(result).toEqual(profile)
  })
})

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /login when no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(requireAuth()).rejects.toThrow(RedirectError)
    try {
      await requireAuth()
    } catch (e) {
      expect((e as RedirectError).url).toBe('/login')
    }
  })

  it('returns user when authenticated', async () => {
    const profile = { id: 'user-1', email: 'test@test.com', full_name: 'Test User', role: 'user' }
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const singleMock = vi.fn(() => Promise.resolve({ data: profile, error: null }))
    const eqMock = vi.fn(() => ({ single: singleMock }))
    const selectMock = vi.fn(() => ({ eq: eqMock }))
    mockFrom.mockReturnValue({ select: selectMock })

    const result = await requireAuth()
    expect(result).toEqual(profile)
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects non-admin to /dashboard', async () => {
    const profile = { id: 'user-1', email: 'test@test.com', full_name: 'Test User', role: 'user' }
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const singleMock = vi.fn(() => Promise.resolve({ data: profile, error: null }))
    const eqMock = vi.fn(() => ({ single: singleMock }))
    const selectMock = vi.fn(() => ({ eq: eqMock }))
    mockFrom.mockReturnValue({ select: selectMock })

    await expect(requireAdmin()).rejects.toThrow(RedirectError)
    try {
      await requireAdmin()
    } catch (e) {
      expect((e as RedirectError).url).toBe('/dashboard')
    }
  })

  it('returns admin user', async () => {
    const profile = { id: 'admin-1', email: 'admin@test.com', full_name: 'Admin', role: 'admin' }
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    const singleMock = vi.fn(() => Promise.resolve({ data: profile, error: null }))
    const eqMock = vi.fn(() => ({ single: singleMock }))
    const selectMock = vi.fn(() => ({ eq: eqMock }))
    mockFrom.mockReturnValue({ select: selectMock })

    const result = await requireAdmin()
    expect(result).toEqual(profile)
  })
})
