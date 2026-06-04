'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getAssignmentsForCycle, createAssignment, deleteAssignment, getMatrixWarnings } from '@/actions/assignments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RELATIONSHIP_LABELS, ANONYMITY_THRESHOLD } from '@/lib/constants'
import type { RelationshipType } from '@/lib/types/database'
import { toast } from 'sonner'

interface Assignment {
  id: string
  reviewer_email: string
  subject_email: string
  reviewer_name: string | null
  subject_name: string | null
  relationship: RelationshipType
  completed_at: string | null
}

interface Warning {
  subject_email: string
  relationship: string
  count: number
}

export default function MatrixPage() {
  const params = useParams()
  const cycleId = params.cycleId as string
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewerEmail, setReviewerEmail] = useState('')
  const [subjectEmail, setSubjectEmail] = useState('')
  const [relationship, setRelationship] = useState<RelationshipType>('peer')

  const loadData = async () => {
    try {
      const data = await getAssignmentsForCycle(cycleId)
      setAssignments(data.map((d: Record<string, unknown>) => ({
        id: d.id as string,
        reviewer_email: d.reviewer_email as string,
        subject_email: d.subject_email as string,
        reviewer_name: d.reviewer_name as string | null,
        subject_name: d.subject_name as string | null,
        relationship: d.relationship as RelationshipType,
        completed_at: d.completed_at as string | null,
      })))
      const w = await getMatrixWarnings(cycleId)
      setWarnings(w)
    } catch {
      toast.error('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [cycleId])

  const handleAdd = async () => {
    if (!reviewerEmail.trim() || !subjectEmail.trim()) {
      toast.error('Enter both reviewer and subject email addresses')
      return
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(reviewerEmail) || !emailRegex.test(subjectEmail)) {
      toast.error('Please enter valid email addresses')
      return
    }
    try {
      await createAssignment({
        review_cycle_id: cycleId,
        reviewer_email: reviewerEmail.trim(),
        subject_email: subjectEmail.trim(),
        relationship,
      })
      toast.success('Assignment added')
      setReviewerEmail('')
      setSubjectEmail('')
      await loadData()
    } catch {
      toast.error('Failed to add assignment (may already exist)')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAssignment(id, cycleId)
      toast.success('Assignment removed')
      await loadData()
    } catch {
      toast.error('Failed to remove assignment')
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold">Rater Matrix</h2>

      {warnings.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Anonymity Warnings</CardTitle>
            <CardDescription>
              Groups below {ANONYMITY_THRESHOLD} reviewers will be suppressed in results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm space-y-1">
              {warnings.map((w, i) => {
                const name = assignments.find(
                  (a) => a.subject_email === w.subject_email
                )?.subject_name ?? w.subject_email
                return (
                  <li key={i}>
                    {name} - {RELATIONSHIP_LABELS[w.relationship]}: {w.count} reviewer{w.count === 1 ? '' : 's'}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Assignment</CardTitle>
          <CardDescription>
            Enter email addresses. Users don&apos;t need to have signed in yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Reviewer email</label>
              <Input
                type="email"
                placeholder="reviewer@example.com"
                value={reviewerEmail}
                onChange={(e) => setReviewerEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Subject email</label>
              <Input
                type="email"
                placeholder="subject@example.com"
                value={subjectEmail}
                onChange={(e) => setSubjectEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1 min-w-[140px]">
              <label className="text-sm font-medium">Relationship</label>
              <Select value={relationship} onValueChange={(v) => v && setRelationship(v as RelationshipType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd}>Add</Button>
          </div>
        </CardContent>
      </Card>

      {assignments.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div>
                        {a.reviewer_name ? (
                          <>
                            <span className="font-medium">{a.reviewer_name}</span>
                            <span className="text-xs text-muted-foreground ml-1">({a.reviewer_email})</span>
                          </>
                        ) : (
                          <>
                            <span>{a.reviewer_email}</span>
                            <Badge variant="outline" className="ml-2 text-xs">invited</Badge>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {a.subject_name ? (
                          <>
                            <span className="font-medium">{a.subject_name}</span>
                            <span className="text-xs text-muted-foreground ml-1">({a.subject_email})</span>
                          </>
                        ) : (
                          <>
                            <span>{a.subject_email}</span>
                            <Badge variant="outline" className="ml-2 text-xs">invited</Badge>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {RELATIONSHIP_LABELS[a.relationship]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.completed_at ? (
                        <Badge variant="secondary">Done</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(a.id)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
