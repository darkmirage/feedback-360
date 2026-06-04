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

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ cycleId: string }>
}) {
  const { cycleId } = await params
  const cycle = await getCycle(cycleId)
  const questions = await getQuestions(cycleId)
  const assignments = await getAssignmentsForCycle(cycleId)

  const completedCount = assignments.filter((a: Record<string, unknown>) => a.completed_at).length
  const totalCount = assignments.length

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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Questions</CardDescription>
            <CardTitle>{questions.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/dashboard/admin/cycles/${cycleId}/questions`}>
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
            <Link href={`/dashboard/admin/cycles/${cycleId}/matrix`}>
              <Button variant="outline" size="sm">Edit Matrix</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle>{completedCount} / {totalCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {totalCount > 0
                ? `${Math.round((completedCount / totalCount) * 100)}%`
                : 'No assignments'}
            </p>
          </CardContent>
        </Card>
      </div>

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
        <Link href={`/dashboard/admin/cycles/${cycleId}/results`}>
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
