'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Assignment {
  reviewer_email: string
  reviewer_name: string | null
  subject_email: string
  subject_name: string | null
  completed_at: string | null
  relationship: string
}

export function CompletionBreakdown({ assignments }: { assignments: Assignment[] }) {
  const [expanded, setExpanded] = useState(false)

  const completed = assignments.filter((a) => a.completed_at)
  const pending = assignments.filter((a) => !a.completed_at)
  const total = assignments.length
  const pct = total > 0 ? Math.round((completed.length / total) * 100) : 0

  return (
    <Card>
      <CardHeader
        className="pb-2 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardDescription>Completed</CardDescription>
            <CardTitle>{completed.length} / {total}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{total > 0 ? `${pct}%` : 'No assignments'}</span>
            <span className="text-muted-foreground text-sm">{expanded ? '−' : '+'}</span>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {pending.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Pending ({pending.length})</p>
              <div className="space-y-1">
                {pending.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <span>{a.reviewer_name || a.reviewer_email}</span>
                    <span className="text-muted-foreground text-xs">
                      reviewing {a.subject_name || a.subject_email}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Submitted ({completed.length})</p>
              <div className="space-y-1">
                {completed.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <div className="flex items-center gap-2">
                      <span>{a.reviewer_name || a.reviewer_email}</span>
                      <Badge variant="secondary" className="text-xs">Done</Badge>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      reviewing {a.subject_name || a.subject_email}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
