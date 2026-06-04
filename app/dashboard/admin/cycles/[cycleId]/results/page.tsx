import { getCycle } from '@/actions/cycles'
import { getAllSubjectResults, getResultsForSubject } from '@/actions/results'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RELATIONSHIP_LABELS } from '@/lib/constants'

export default async function AdminResultsPage({
  params,
}: {
  params: Promise<{ cycleId: string }>
}) {
  const { cycleId } = await params
  const cycle = await getCycle(cycleId)
  const subjects = await getAllSubjectResults(cycleId)

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Results: {cycle.title}</h2>
        <p className="text-muted-foreground">
          Admin view — all subjects, anonymized (no reviewer names)
        </p>
      </div>

      {subjects.map(async (subject) => {
        const results = await getResultsForSubject(cycleId, subject.email)
        return (
          <Card key={subject.email}>
            <CardHeader>
              <CardTitle>{subject.full_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {results.groups.length === 0 ? (
                <p className="text-muted-foreground">No completed reviews.</p>
              ) : (
                results.groups.map((group) => (
                  <div key={group.relationship} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {RELATIONSHIP_LABELS[group.relationship]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {group.responseCount} response{group.responseCount === 1 ? '' : 's'}
                      </span>
                    </div>

                    {group.questions.map((q) => (
                      <div key={q.question_id} className="pl-4 border-l-2 space-y-1">
                        <p className="text-sm font-medium">{q.question_text}</p>
                        {q.averageRating !== null && (
                          <p className="text-sm text-muted-foreground">
                            Average rating: {q.averageRating}/5
                          </p>
                        )}
                        {q.openTextResponses.length > 0 ? (
                          <ul className="text-sm space-y-1">
                            {q.openTextResponses.map((text, i) => (
                              <li key={i} className="text-muted-foreground bg-muted/50 p-2 rounded">
                                {text}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No responses</p>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
