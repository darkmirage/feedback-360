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

import { getCurrentUser, requireAuth, requireAdmin, requireAdminOrManager, requireCycleAccess } from '@/actions/auth'

function mockProfile(profile: { id: string; email: string; full_name: string; role: string }) {
  mockGetUser.mockResolvedValue({ data: { user: { id: profile.id } }, error: null })
  const singleMock = vi.fn(() => Promise.resolve({ data: profile, error: null }))
  const eqMock = vi.fn(() => ({ single: singleMock }))
  const selectMock = vi.fn(() => ({ eq: eqMock }))
  mockFrom.mockReturnValue({ select: selectMock })
}

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
    mockProfile(profile)

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
    mockProfile(profile)

    const result = await requireAuth()
    expect(result).toEqual(profile)
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects non-admin to /', async () => {
    mockProfile({ id: 'user-1', email: 'test@test.com', full_name: 'Test User', role: 'user' })

    await expect(requireAdmin()).rejects.toThrow(RedirectError)
    try {
      await requireAdmin()
    } catch (e) {
      expect((e as RedirectError).url).toBe('/')
    }
  })

  it('returns admin user', async () => {
    const profile = { id: 'admin-1', email: 'admin@test.com', full_name: 'Admin', role: 'admin' }
    mockProfile(profile)

    const result = await requireAdmin()
    expect(result).toEqual(profile)
  })
})

describe('requireAdminOrManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows admin', async () => {
    const profile = { id: 'admin-1', email: 'admin@test.com', full_name: 'Admin', role: 'admin' }
    mockProfile(profile)

    const result = await requireAdminOrManager()
    expect(result).toEqual(profile)
  })

  it('allows manager', async () => {
    const profile = { id: 'mgr-1', email: 'mgr@test.com', full_name: 'Manager', role: 'manager' }
    mockProfile(profile)

    const result = await requireAdminOrManager()
    expect(result).toEqual(profile)
  })

  it('redirects regular user to /', async () => {
    mockProfile({ id: 'user-1', email: 'test@test.com', full_name: 'User', role: 'user' })

    await expect(requireAdminOrManager()).rejects.toThrow(RedirectError)
    try {
      await requireAdminOrManager()
    } catch (e) {
      expect((e as RedirectError).url).toBe('/')
    }
  })
})

describe('requireCycleAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows admin to access any cycle', async () => {
    const profile = { id: 'admin-1', email: 'admin@test.com', full_name: 'Admin', role: 'admin' }
    mockGetUser.mockResolvedValue({ data: { user: { id: profile.id } }, error: null })

    const cycle = { id: 'cycle-1', created_by: 'other-user', title: 'Test', status: 'active' }

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // users table for profile
        const singleMock = vi.fn(() => Promise.resolve({ data: profile, error: null }))
        const eqMock = vi.fn(() => ({ single: singleMock }))
        const selectMock = vi.fn(() => ({ eq: eqMock }))
        return { select: selectMock }
      }
      // review_cycles table
      const singleMock = vi.fn(() => Promise.resolve({ data: cycle, error: null }))
      const eqMock = vi.fn(() => ({ single: singleMock }))
      const selectMock = vi.fn(() => ({ eq: eqMock }))
      return { select: selectMock }
    })

    const result = await requireCycleAccess('cycle-1')
    expect(result.user).toEqual(profile)
    expect(result.cycle).toEqual(cycle)
  })

  it('allows manager to access own cycle', async () => {
    const profile = { id: 'mgr-1', email: 'mgr@test.com', full_name: 'Manager', role: 'manager' }
    mockGetUser.mockResolvedValue({ data: { user: { id: profile.id } }, error: null })

    const cycle = { id: 'cycle-1', created_by: 'mgr-1', title: 'Test', status: 'active' }

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        const singleMock = vi.fn(() => Promise.resolve({ data: profile, error: null }))
        const eqMock = vi.fn(() => ({ single: singleMock }))
        const selectMock = vi.fn(() => ({ eq: eqMock }))
        return { select: selectMock }
      }
      const singleMock = vi.fn(() => Promise.resolve({ data: cycle, error: null }))
      const eqMock = vi.fn(() => ({ single: singleMock }))
      const selectMock = vi.fn(() => ({ eq: eqMock }))
      return { select: selectMock }
    })

    const result = await requireCycleAccess('cycle-1')
    expect(result.user).toEqual(profile)
    expect(result.cycle).toEqual(cycle)
  })

  it('redirects manager for other user cycle', async () => {
    const profile = { id: 'mgr-1', email: 'mgr@test.com', full_name: 'Manager', role: 'manager' }
    mockGetUser.mockResolvedValue({ data: { user: { id: profile.id } }, error: null })

    const cycle = { id: 'cycle-1', created_by: 'other-mgr', title: 'Test', status: 'active' }

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        const singleMock = vi.fn(() => Promise.resolve({ data: profile, error: null }))
        const eqMock = vi.fn(() => ({ single: singleMock }))
        const selectMock = vi.fn(() => ({ eq: eqMock }))
        return { select: selectMock }
      }
      const singleMock = vi.fn(() => Promise.resolve({ data: cycle, error: null }))
      const eqMock = vi.fn(() => ({ single: singleMock }))
      const selectMock = vi.fn(() => ({ eq: eqMock }))
      return { select: selectMock }
    })

    await expect(requireCycleAccess('cycle-1')).rejects.toThrow(RedirectError)
  })

  it('redirects regular user', async () => {
    mockProfile({ id: 'user-1', email: 'test@test.com', full_name: 'User', role: 'user' })

    await expect(requireCycleAccess('cycle-1')).rejects.toThrow(RedirectError)
  })
})
