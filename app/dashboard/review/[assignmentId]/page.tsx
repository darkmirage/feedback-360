import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/actions/auth'
import { getResponsesForAssignment } from '@/actions/responses'
import { getQuestions } from '@/actions/questions'
import { redirect } from 'next/navigation'
import { ReviewForm } from '@/components/review/review-form'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = await params
  const user = await requireAuth()
  const supabase = await createClient()

  // Get the assignment and verify it belongs to this user
  const { data: assignment, error } = await supabase
    .from('review_assignments')
    .select('*, subject:users!subject_id(full_name), review_cycle:review_cycles!review_cycle_id(id, title, status)')
    .eq('id', assignmentId)
    .single()

  if (error || !assignment) redirect('/dashboard')
  if (assignment.reviewer_id !== user.id) redirect('/dashboard')

  const cycle = assignment.review_cycle as unknown as { id: string; title: string; status: string }
  if (cycle.status !== 'active') redirect('/dashboard')

  const subject = assignment.subject as unknown as { full_name: string }
  const questions = await getQuestions(cycle.id)
  const existingResponses = await getResponsesForAssignment(assignmentId)

  const isCompleted = !!assignment.completed_at

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Review for {subject.full_name}</h2>
        <p className="text-muted-foreground">{cycle.title}</p>
        {isCompleted && (
          <p className="text-sm text-green-600 font-medium mt-1">
            This review has been submitted.
          </p>
        )}
      </div>

      <ReviewForm
        assignmentId={assignmentId}
        questions={questions}
        existingResponses={existingResponses}
        isCompleted={isCompleted}
      />
    </div>
  )
}
