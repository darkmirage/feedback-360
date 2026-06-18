'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== 'admin') redirect('/')
  return user
}

export async function requireAdminOrManager() {
  const user = await requireAuth()
  if (user.role !== 'admin' && user.role !== 'manager') redirect('/')
  return user
}

export async function requireCycleAccess(cycleId: string) {
  const user = await requireAuth()

  if (user.role === 'admin') {
    const supabase = await createClient()
    const { data: cycle, error } = await supabase
      .from('review_cycles')
      .select('*')
      .eq('id', cycleId)
      .single()
    if (error || !cycle) throw new Error('Cycle not found')
    return { user, cycle }
  }

  if (user.role === 'manager') {
    const supabase = await createClient()
    const { data: cycle, error } = await supabase
      .from('review_cycles')
      .select('*')
      .eq('id', cycleId)
      .single()
    if (error || !cycle) throw new Error('Cycle not found')
    if (cycle.created_by !== user.id) redirect('/')
    return { user, cycle }
  }

  redirect('/')
}
