'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from './auth'
import { revalidatePath } from 'next/cache'

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

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/admin/cycles/${cycleId}`)
}
