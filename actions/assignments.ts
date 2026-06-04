'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireAuth } from './auth'
import { ANONYMITY_THRESHOLD } from '@/lib/constants'
import type { RelationshipType } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'

export async function getAssignmentsForCycle(cycleId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('review_assignments')
    .select('*, reviewer:users!reviewer_id(id, full_name, email), subject:users!subject_id(id, full_name, email)')
    .eq('review_cycle_id', cycleId)
    .order('created_at')

  if (error) throw new Error(error.message)
  return data
}

export async function createAssignment(params: {
  review_cycle_id: string
  reviewer_id: string
  subject_id: string
  relationship: RelationshipType
}) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('review_assignments')
    .insert({
      review_cycle_id: params.review_cycle_id,
      reviewer_id: params.reviewer_id,
      subject_id: params.subject_id,
      relationship: params.relationship,
    })

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/admin/cycles/${params.review_cycle_id}/matrix`)
}

export async function deleteAssignment(assignmentId: string, cycleId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('review_assignments')
    .delete()
    .eq('id', assignmentId)

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/admin/cycles/${cycleId}/matrix`)
}

export async function getMyAssignments() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('review_assignments')
    .select('*, subject:users!subject_id(id, full_name), review_cycle:review_cycles!review_cycle_id(id, title, status)')
    .eq('reviewer_id', user.id)

  if (error) throw new Error(error.message)
  return data
}

export async function getMatrixWarnings(cycleId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: assignments, error } = await admin
    .from('review_assignments')
    .select('subject_id, relationship')
    .eq('review_cycle_id', cycleId)
    .neq('relationship', 'self')

  if (error) throw new Error(error.message)

  // Group by subject + relationship and find groups below threshold
  const groups: Record<string, number> = {}
  for (const a of assignments) {
    const key = `${a.subject_id}:${a.relationship}`
    groups[key] = (groups[key] || 0) + 1
  }

  const warnings: Array<{ subject_id: string; relationship: string; count: number }> = []
  for (const [key, count] of Object.entries(groups)) {
    if (count < ANONYMITY_THRESHOLD) {
      const [subject_id, relationship] = key.split(':')
      warnings.push({ subject_id, relationship, count })
    }
  }

  return warnings
}
