import { requireAuth } from '@/actions/auth'
import { getCycle } from '@/actions/cycles'
import { getResultsForSubject } from '@/actions/results'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RELATIONSHIP_LABELS } from '@/lib/constants'
import { redirect } from 'next/navigation'

export default async function MyResultsPage({
  params,
}: {
  params: Promise<{ cycleId: string }>
}) {
  const { cycleId } = await params
  const user = await requireAuth()

  const cycle = await getCycle(cycleId)
  if (cycle.status !== 'results_published') redirect('/dashboard')

  let results
  try {
    results = await getResultsForSubject(cycleId, user.email)
  } catch {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Your Results</h2>
        <p className="text-muted-foreground">{cycle.title}</p>
      </div>

      {results.groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No results available for you in this cycle.
          </CardContent>
        </Card>
      ) : (
        results.groups.map((group) => (
          <Card key={group.relationship}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {RELATIONSHIP_LABELS[group.relationship]} Feedback
                </CardTitle>
                <Badge variant="outline">
                  {group.responseCount} response{group.responseCount === 1 ? '' : 's'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.questions.map((q) => (
                <div key={q.question_id} className="space-y-2">
                  <p className="text-sm font-medium">{q.question_text}</p>
                  {q.averageRating !== null && (
                    <p className="text-sm">
                      Average rating: <span className="font-semibold">{q.averageRating}</span>/5
                    </p>
                  )}
                  {q.openTextResponses.length > 0 ? (
                    <ul className="space-y-1">
                      {q.openTextResponses.map((text, i) => (
                        <li key={i} className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                          {text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No responses</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
