import { getCycle, transitionCycle } from '@/actions/cycles'
import { getQuestions } from '@/actions/questions'
import { getAssignmentsForCycle } from '@/actions/assignments'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CYCLE_STATUS_LABELS, VALID_TRANSITIONS } from '@/lib/constants'
import Link from 'next/link'
import { CycleTransitionButton } from '@/components/admin/cycle-transition-button'
import { DeleteCycleButton } from '@/components/admin/delete-cycle-button'
import { RevertCycleButton } from '@/components/admin/revert-cycle-button'
import { CompletionBreakdown } from '@/components/admin/completion-breakdown'

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ cycleId: string }>
}) {
  const { cycleId } = await params
  const cycle = await getCycle(cycleId)
  const questions = await getQuestions(cycleId)
  const assignments = await getAssignmentsForCycle(cycleId)

  const totalCount = assignments.length

  const assignmentList = assignments.map((a: Record<string, unknown>) => ({
    reviewer_email: a.reviewer_email as string,
    reviewer_name: a.reviewer_name as string | null,
    subject_email: a.subject_email as string,
    subject_name: a.subject_name as string | null,
    completed_at: a.completed_at as string | null,
    relationship: a.relationship as string,
  }))

  const nextStatus = VALID_TRANSITIONS[cycle.status]

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{cycle.title}</h2>
          <p className="text-muted-foreground">
            Created {new Date(cycle.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="default">
          {CYCLE_STATUS_LABELS[cycle.status] || cycle.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Questions</CardDescription>
            <CardTitle>{questions.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/cycles/${cycleId}/questions`}>
              <Button variant="outline" size="sm">Edit Questions</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assignments</CardDescription>
            <CardTitle>{totalCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/cycles/${cycleId}/matrix`}>
              <Button variant="outline" size="sm">Edit Matrix</Button>
            </Link>
          </CardContent>
        </Card>

      </div>

      <CompletionBreakdown assignments={assignmentList} />


      {nextStatus && (
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="font-medium">
                Advance to {CYCLE_STATUS_LABELS[nextStatus]}
              </p>
              <p className="text-sm text-muted-foreground">
                {cycle.status === 'draft' && 'Reviewers will be able to submit responses.'}
                {cycle.status === 'active' && 'No more responses will be accepted.'}
                {cycle.status === 'closed' && 'Subjects will be able to see their aggregated results.'}
              </p>
            </div>
            <CycleTransitionButton cycleId={cycleId} currentStatus={cycle.status} />
          </CardContent>
        </Card>
      )}

      {(cycle.status === 'closed' || cycle.status === 'results_published') && (
        <Link href={`/cycles/${cycleId}/results`}>
          <Button>View All Results</Button>
        </Link>
      )}

      {cycle.status === 'active' && (
        <RevertCycleButton cycleId={cycleId} />
      )}

      <DeleteCycleButton cycleId={cycleId} />
    </div>
  )
}
