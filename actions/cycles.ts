'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, requireAdminOrManager, requireCycleAccess } from './auth'
import { VALID_TRANSITIONS } from '@/lib/constants'
import type { ReviewCycleStatus } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'

export async function createCycle(title: string) {
  const user = await requireAdminOrManager()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('review_cycles')
    .insert({ title, created_by: user.id })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/cycles')
  return data
}

export async function getCycles() {
  const user = await requireAdminOrManager()
  const supabase = await createClient()

  let query = supabase
    .from('review_cycles')
    .select('*, owner:users!created_by(full_name)')
    .order('created_at', { ascending: false })

  if (user.role === 'manager') {
    query = query.eq('created_by', user.id)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function getPublishedCycles() {
  await requireAuth()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('review_cycles')
    .select('*')
    .eq('status', 'results_published')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getCycle(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('review_cycles')
    .select('*, owner:users!created_by(full_name)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function transitionCycle(cycleId: string, currentStatus: ReviewCycleStatus) {
  await requireCycleAccess(cycleId)
  const nextStatus = VALID_TRANSITIONS[currentStatus] as ReviewCycleStatus | undefined
  if (!nextStatus) throw new Error(`Cannot transition from ${currentStatus}`)

  const admin = createAdminClient()
  const { error } = await admin
    .from('review_cycles')
    .update({ status: nextStatus })
    .eq('id', cycleId)

  if (error) throw new Error(error.message)
  revalidatePath(`/cycles/${cycleId}`)
  revalidatePath('/cycles')
  revalidatePath('/')
  return nextStatus
}

export async function revertCycleToDraft(cycleId: string) {
  await requireCycleAccess(cycleId)
  const admin = createAdminClient()

  // Only allow reverting from 'active' status
  const { data: cycle, error: fetchError } = await admin
    .from('review_cycles')
    .select('status')
    .eq('id', cycleId)
    .single()

  if (fetchError || !cycle) throw new Error('Cycle not found')
  if (cycle.status !== 'active') throw new Error('Can only revert active cycles to draft')

  const { error } = await admin
    .from('review_cycles')
    .update({ status: 'draft' })
    .eq('id', cycleId)

  if (error) throw new Error(error.message)
  revalidatePath(`/cycles/${cycleId}`)
  revalidatePath('/cycles')
  revalidatePath('/')
}

export async function deleteCycle(cycleId: string) {
  await requireCycleAccess(cycleId)
  const admin = createAdminClient()

  const { error } = await admin
    .from('review_cycles')
    .delete()
    .eq('id', cycleId)

  if (error) throw new Error(error.message)
  revalidatePath('/cycles')
  revalidatePath('/')
}
