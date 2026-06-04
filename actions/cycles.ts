'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from './auth'
import { VALID_TRANSITIONS } from '@/lib/constants'
import type { ReviewCycleStatus } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'

export async function createCycle(title: string) {
  const user = await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('review_cycles')
    .insert({ title, created_by: user.id })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/admin')
  return data
}

export async function getCycles() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('review_cycles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getCycle(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('review_cycles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function transitionCycle(cycleId: string, currentStatus: ReviewCycleStatus) {
  await requireAdmin()
  const nextStatus = VALID_TRANSITIONS[currentStatus] as ReviewCycleStatus | undefined
  if (!nextStatus) throw new Error(`Cannot transition from ${currentStatus}`)

  const admin = createAdminClient()
  const { error } = await admin
    .from('review_cycles')
    .update({ status: nextStatus })
    .eq('id', cycleId)

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/admin/cycles/${cycleId}`)
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard')
  return nextStatus
}

export async function deleteCycle(cycleId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('review_cycles')
    .delete()
    .eq('id', cycleId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/admin')
}
