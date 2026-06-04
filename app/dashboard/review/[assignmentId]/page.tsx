import { createAdminClient } from '@/lib/supabase/admin'
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
  const admin = createAdminClient()

  // Get the assignment from the view for resolved names
  const { data: assignment, error } = await admin
    .from('assignment_details')
    .select('*, review_cycle:review_cycles!review_cycle_id(id, title, status)')
    .eq('id', assignmentId)
    .single()

  if (error || !assignment) redirect('/dashboard')
  if (assignment.reviewer_email.toLowerCase() !== user.email.toLowerCase()) redirect('/dashboard')

  const cycle = assignment.review_cycle as unknown as { id: string; title: string; status: string }
  if (cycle.status !== 'active') redirect('/dashboard')

  const subjectName = assignment.subject_name ?? assignment.subject_email
  const questions = await getQuestions(cycle.id)
  const existingResponses = await getResponsesForAssignment(assignmentId)

  const isSubmitted = !!assignment.completed_at

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Review for {subjectName}</h2>
        <p className="text-muted-foreground">{cycle.title}</p>
        {isSubmitted && (
          <p className="text-sm text-green-600 font-medium mt-1">
            Submitted — you can still edit until the cycle closes.
          </p>
        )}
      </div>

      <ReviewForm
        assignmentId={assignmentId}
        questions={questions}
        existingResponses={existingResponses}
        isSubmitted={isSubmitted}
      />
    </div>
  )
}
