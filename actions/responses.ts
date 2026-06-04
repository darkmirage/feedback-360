'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './auth'
import { revalidatePath } from 'next/cache'

export async function getResponsesForAssignment(assignmentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('assignment_id', assignmentId)

  if (error) throw new Error(error.message)
  return data
}

export async function autosaveResponse(params: {
  assignment_id: string
  question_id: string
  open_text?: string | null
  rating_value?: number | null
}) {
  await requireAuth()
  const supabase = await createClient()

  const { error } = await supabase
    .from('responses')
    .upsert(
      {
        assignment_id: params.assignment_id,
        question_id: params.question_id,
        open_text: params.open_text,
        rating_value: params.rating_value,
      },
      { onConflict: 'assignment_id,question_id' }
    )

  if (error) throw new Error(error.message)
}

export async function submitReview(assignmentId: string) {
  const user = await requireAuth()
  const supabase = await createClient()

  // Verify the assignment belongs to this user by email
  const { data: assignment, error: fetchError } = await supabase
    .from('review_assignments')
    .select('reviewer_email')
    .eq('id', assignmentId)
    .single()

  if (fetchError || !assignment) throw new Error('Assignment not found')
  if (assignment.reviewer_email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('Not your assignment')
  }

  const { error } = await supabase
    .from('review_assignments')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', assignmentId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}
