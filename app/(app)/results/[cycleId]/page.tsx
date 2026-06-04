import { requireAuth } from '@/actions/auth'
import { getCycle } from '@/actions/cycles'
import { getResultsForSubject } from '@/actions/results'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RELATIONSHIP_LABELS } from '@/lib/constants'
import { redirect } from 'next/navigation'

const relationshipColors: Record<string, string> = {
  self: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  peer: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  direct_report: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  manager: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
}

export default async function MyResultsPage({
  params,
}: {
  params: Promise<{ cycleId: string }>
}) {
  const { cycleId } = await params
  const user = await requireAuth()

  const cycle = await getCycle(cycleId)
  if (cycle.status !== 'results_published') redirect('/')

  let results
  try {
    results = await getResultsForSubject(cycleId, user.email)
  } catch {
    redirect('/')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Your Results</h2>
        <p className="text-muted-foreground">{cycle.title}</p>
      </div>

      {results.byQuestion.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No results available for you in this cycle.
          </CardContent>
        </Card>
      ) : (
        results.byQuestion.map((q) => (
          <Card key={q.question_id}>
            <CardHeader>
              <CardTitle className="text-base">{q.question_text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {q.is_rating && q.overallAverageRating !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold">{q.overallAverageRating}</span>
                  <span className="text-sm text-muted-foreground">/ 5 average</span>
                </div>
              )}
              {q.taggedResponses.length > 0 ? (
                <ul className="space-y-2">
                  {q.taggedResponses.map((r, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <Badge
                        variant="secondary"
                        className={`text-[11px] mt-0.5 shrink-0 ${relationshipColors[r.relationship] ?? ''}`}
                      >
                        {RELATIONSHIP_LABELS[r.relationship] ?? r.relationship}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{r.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                !q.is_rating && (
                  <p className="text-sm text-muted-foreground italic">No text responses</p>
                )
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
