import { getMyAssignments } from '@/actions/assignments'
import { requireAuth } from '@/actions/auth'
import { getCycles } from '@/actions/cycles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RELATIONSHIP_LABELS } from '@/lib/constants'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await requireAuth()
  const assignments = await getMyAssignments()
  const cycles = await getCycles()

  const activeCycles = cycles.filter((c) => c.status === 'active')
  const publishedCycles = cycles.filter((c) => c.status === 'results_published')

  const pendingAssignments = assignments.filter(
    (a) =>
      !a.completed_at &&
      (a.review_cycle as unknown as { status: string })?.status === 'active'
  )
  const completedAssignments = assignments.filter((a) => !!a.completed_at)

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Welcome, {user.full_name}</h2>
        <p className="text-muted-foreground">
          {pendingAssignments.length > 0
            ? `You have ${pendingAssignments.length} pending review${pendingAssignments.length === 1 ? '' : 's'}`
            : 'No pending reviews'}
        </p>
      </div>

      {pendingAssignments.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Pending Reviews</h3>
          <div className="space-y-3">
            {pendingAssignments.map((a) => {
              const subject = a.subject as unknown as { id: string; full_name: string }
              const cycle = a.review_cycle as unknown as { id: string; title: string }
              return (
                <Card key={a.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Review for {subject.full_name}
                        </CardTitle>
                        <CardDescription>{cycle.title}</CardDescription>
                      </div>
                      <Badge variant="outline">
                        {RELATIONSHIP_LABELS[a.relationship] || a.relationship}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/dashboard/review/${a.id}`}>
                      <Button size="sm">Start Review</Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {completedAssignments.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Completed Reviews</h3>
          <div className="space-y-3">
            {completedAssignments.map((a) => {
              const subject = a.subject as unknown as { id: string; full_name: string }
              const cycle = a.review_cycle as unknown as { id: string; title: string }
              return (
                <Card key={a.id} className="opacity-70">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Review for {subject.full_name}
                        </CardTitle>
                        <CardDescription>{cycle.title}</CardDescription>
                      </div>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {publishedCycles.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Your Results</h3>
          <div className="space-y-3">
            {publishedCycles.map((cycle) => (
              <Card key={cycle.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{cycle.title}</CardTitle>
                  <CardDescription>Results are available</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/dashboard/results/${cycle.id}`}>
                    <Button size="sm" variant="outline">View Results</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
