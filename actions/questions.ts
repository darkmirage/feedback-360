'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from './auth'
import { revalidatePath } from 'next/cache'

async function wipeResponsesForCycle(cycleId: string) {
  const admin = createAdminClient()

  // Get all assignment IDs for this cycle
  const { data: assignments, error: aErr } = await admin
    .from('review_assignments')
    .select('id')
    .eq('review_cycle_id', cycleId)

  if (aErr || !assignments || assignments.length === 0) return

  const assignmentIds = assignments.map((a) => a.id)

  // Delete all responses for these assignments
  const { error: rErr } = await admin
    .from('responses')
    .delete()
    .in('assignment_id', assignmentIds)

  if (rErr) throw new Error(rErr.message)

  // Reset completed_at on all assignments
  const { error: uErr } = await admin
    .from('review_assignments')
    .update({ completed_at: null })
    .eq('review_cycle_id', cycleId)

  if (uErr) throw new Error(uErr.message)
}

export async function getQuestions(cycleId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('review_cycle_id', cycleId)
    .order('question_order')

  if (error) throw new Error(error.message)
  return data
}

export async function upsertQuestion(params: {
  id?: string
  review_cycle_id: string
  question_text: string
  question_order: number
  is_open_ended?: boolean
  is_rating?: boolean
}) {
  await requireAdmin()
  const supabase = await createClient()

  // Wipe responses if questions are being modified on a draft cycle
  await wipeResponsesForCycle(params.review_cycle_id)

  if (params.id) {
    const { error } = await supabase
      .from('questions')
      .update({
        question_text: params.question_text,
        question_order: params.question_order,
        is_open_ended: params.is_open_ended ?? true,
        is_rating: params.is_rating ?? false,
      })
      .eq('id', params.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('questions')
      .insert({
        review_cycle_id: params.review_cycle_id,
        question_text: params.question_text,
        question_order: params.question_order,
        is_open_ended: params.is_open_ended ?? true,
        is_rating: params.is_rating ?? false,
      })
    if (error) throw new Error(error.message)
  }

  revalidatePath(`/dashboard/admin/cycles/${params.review_cycle_id}`)
}

export async function deleteQuestion(questionId: string, cycleId: string) {
  await requireAdmin()
  const supabase = await createClient()

  await wipeResponsesForCycle(cycleId)

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/admin/cycles/${cycleId}`)
}
