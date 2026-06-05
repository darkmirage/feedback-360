'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getAssignmentsForCycle, createAssignment, deleteAssignment } from '@/actions/assignments'
import { getPeople } from '@/actions/people'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RELATIONSHIP_LABELS } from '@/lib/constants'
import type { RelationshipType } from '@/lib/types/database'
import { toast } from 'sonner'

interface Person {
  id: string
  email: string
  first_name: string
  last_name: string
}

interface Assignment {
  id: string
  reviewer_email: string
  subject_email: string
  reviewer_name: string | null
  subject_name: string | null
  relationship: RelationshipType
  completed_at: string | null
}

function personName(p: Person) {
  const name = `${p.first_name} ${p.last_name}`.trim()
  return name || p.email
}

export default function MatrixPage() {
  const params = useParams()
  const cycleId = params.cycleId as string
  const [people, setPeople] = useState<Person[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  // Add reviewer state per expanded subject
  const [addReviewerEmail, setAddReviewerEmail] = useState('')
  const [addRelationship, setAddRelationship] = useState<RelationshipType>('peer')

  const loadData = async () => {
    try {
      const [pData, aData] = await Promise.all([
        getPeople(),
        getAssignmentsForCycle(cycleId),
      ])
      setPeople(pData as Person[])
      setAssignments(aData.map((d: Record<string, unknown>) => ({
        id: d.id as string,
        reviewer_email: d.reviewer_email as string,
        subject_email: d.subject_email as string,
        reviewer_name: d.reviewer_name as string | null,
        subject_name: d.subject_name as string | null,
        relationship: d.relationship as RelationshipType,
        completed_at: d.completed_at as string | null,
      })))
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [cycleId])

  const subjectEmails = [...new Set(assignments.map((a) => a.subject_email))]
  const assignmentsBySubject = (email: string) => assignments.filter((a) => a.subject_email === email)
  const personByEmail = (email: string) => people.find((p) => p.email === email)

  const handleAddReviewer = async (subjectEmail: string) => {
    if (!addReviewerEmail) {
      toast.error('Select a reviewer')
      return
    }
    try {
      await createAssignment({
        review_cycle_id: cycleId,
        reviewer_email: addReviewerEmail,
        subject_email: subjectEmail,
        relationship: addRelationship,
      })
      toast.success('Reviewer added')
      setAddReviewerEmail('')
      setAddRelationship('peer')
      await loadData()
    } catch {
      toast.error('Failed to add reviewer (may already exist)')
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await deleteAssignment(assignmentId, cycleId)
      toast.success('Reviewer removed')
      await loadData()
    } catch {
      toast.error('Failed to remove reviewer')
    }
  }

  const handleAddSubject = async (subjectEmail: string) => {
    // Add a self-review as the initial assignment to register this person as a subject
    try {
      await createAssignment({
        review_cycle_id: cycleId,
        reviewer_email: subjectEmail,
        subject_email: subjectEmail,
        relationship: 'self',
      })
      toast.success('Subject added with self-review')
      setExpandedSubject(subjectEmail)
      await loadData()
    } catch {
      toast.error('Failed to add subject')
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  // People who are already subjects in this cycle
  const existingSubjectEmails = new Set(subjectEmails)
  // People not yet added as subjects
  const availableSubjects = people.filter((p) => !existingSubjectEmails.has(p.email))

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Review Assignments</h2>
          <p className="text-muted-foreground">
            Select who is being reviewed, then assign their reviewers.
          </p>
        </div>
        <Link href={`/cycles/${cycleId}`}>
          <Button variant="outline">Back to Cycle</Button>
        </Link>
      </div>

      {/* Add subject */}
      {availableSubjects.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Subject</CardTitle>
            <CardDescription>Select a person to be reviewed in this cycle.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Select onValueChange={(v) => { if (typeof v === 'string') handleAddSubject(v) }}>
                  <SelectTrigger><SelectValue placeholder="Select a person..." /></SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((p) => (
                      <SelectItem key={p.id} value={p.email}>
                        {personName(p)} ({p.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {people.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No team members in roster. <a href="/team" className="underline">Add people first.</a>
          </CardContent>
        </Card>
      )}

      {/* Subject list */}
      {subjectEmails.length > 0 && (
        <div className="space-y-3">
          {subjectEmails.map((subjectEmail) => {
            const subjectPerson = personByEmail(subjectEmail)
            const subjectName = subjectPerson ? personName(subjectPerson) : subjectEmail
            const subjectAssignments = assignmentsBySubject(subjectEmail)
            const isExpanded = expandedSubject === subjectEmail
            const reviewerCount = subjectAssignments.filter((a) => a.relationship !== 'self').length

            return (
              <Card key={subjectEmail}>
                <CardHeader
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedSubject(isExpanded ? null : subjectEmail)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{subjectName}</CardTitle>
                      <CardDescription>{subjectEmail}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {reviewerCount} reviewer{reviewerCount === 1 ? '' : 's'}
                      </Badge>
                      <span className="text-muted-foreground text-sm">{isExpanded ? '−' : '+'}</span>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4">
                    {/* Current reviewers */}
                    {subjectAssignments.length > 0 && (
                      <div className="space-y-1">
                        {subjectAssignments.map((a) => {
                          const reviewerPerson = personByEmail(a.reviewer_email)
                          const reviewerDisplay = reviewerPerson ? personName(reviewerPerson) : a.reviewer_email
                          return (
                            <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{reviewerDisplay}</span>
                                <Badge variant="outline" className="text-xs">
                                  {RELATIONSHIP_LABELS[a.relationship]}
                                </Badge>
                                {a.completed_at && (
                                  <Badge variant="secondary" className="text-xs">Done</Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive h-7 text-xs"
                                onClick={() => handleRemoveAssignment(a.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Add reviewer */}
                    <div className="flex gap-2 items-end pt-2 border-t">
                      <div className="flex-1">
                        <Select value={addReviewerEmail} onValueChange={(v) => v && setAddReviewerEmail(v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Add reviewer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {people
                              .filter((p) => !subjectAssignments.some((a) => a.reviewer_email === p.email))
                              .map((p) => (
                                <SelectItem key={p.id} value={p.email}>
                                  {personName(p)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-[130px]">
                        <Select value={addRelationship} onValueChange={(v) => v && setAddRelationship(v as RelationshipType)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(RELATIONSHIP_LABELS)
                              .filter(([k]) => k !== 'self')
                              .map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button size="sm" className="h-9" onClick={() => handleAddReviewer(subjectEmail)}>
                        Add
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Reviewer workload summary */}
      {assignments.length > 0 && (() => {
        const workload = new Map<string, number>()
        for (const a of assignments) {
          if (a.relationship === 'self') continue
          workload.set(a.reviewer_email, (workload.get(a.reviewer_email) ?? 0) + 1)
        }
        const sorted = [...workload.entries()].sort((a, b) => b[1] - a[1])
        if (sorted.length === 0) return null
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reviewer Workload</CardTitle>
              <CardDescription>Number of reviews assigned per person (excluding self-reviews)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {sorted.map(([email, count]) => {
                  const person = personByEmail(email)
                  return (
                    <div key={email} className="flex items-center justify-between py-1.5 text-sm">
                      <span>{person ? personName(person) : email}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}
