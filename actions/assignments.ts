'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireAuth } from './auth'
import { ANONYMITY_THRESHOLD, ANONYMITY_EXEMPT_RELATIONSHIPS } from '@/lib/constants'
import type { RelationshipType } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'

export async function getAssignmentsForCycle(cycleId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  // Use the assignment_details view for resolved names
  const { data, error } = await admin
    .from('assignment_details')
    .select('*')
    .eq('review_cycle_id', cycleId)
    .order('created_at')

  if (error) throw new Error(error.message)
  return data
}

export async function createAssignment(params: {
  review_cycle_id: string
  reviewer_email: string
  subject_email: string
  relationship: RelationshipType
}) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('review_assignments')
    .insert({
      review_cycle_id: params.review_cycle_id,
      reviewer_email: params.reviewer_email.toLowerCase().trim(),
      subject_email: params.subject_email.toLowerCase().trim(),
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
  const admin = createAdminClient()

  // Use admin client to query the view (RLS doesn't apply to views by default)
  const { data, error } = await admin
    .from('assignment_details')
    .select('*, review_cycle:review_cycles!review_cycle_id(id, title, status)')
    .eq('reviewer_email', user.email.toLowerCase())

  if (error) throw new Error(error.message)
  return data
}

export async function getMatrixWarnings(cycleId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: assignments, error } = await admin
    .from('review_assignments')
    .select('subject_email, relationship')
    .eq('review_cycle_id', cycleId)
    .not('relationship', 'in', `(${ANONYMITY_EXEMPT_RELATIONSHIPS.join(',')})`)

  if (error) throw new Error(error.message)

  // Group by subject + relationship and find groups below threshold
  const groups: Record<string, number> = {}
  for (const a of assignments) {
    const key = `${a.subject_email}:${a.relationship}`
    groups[key] = (groups[key] || 0) + 1
  }

  const warnings: Array<{ subject_email: string; relationship: string; count: number }> = []
  for (const [key, count] of Object.entries(groups)) {
    if (count < ANONYMITY_THRESHOLD) {
      const [subject_email, relationship] = key.split(':')
      warnings.push({ subject_email, relationship, count })
    }
  }

  return warnings
}
