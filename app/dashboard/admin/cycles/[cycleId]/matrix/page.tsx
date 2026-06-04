'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getAssignmentsForCycle, createAssignment, deleteAssignment, getMatrixWarnings } from '@/actions/assignments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RELATIONSHIP_LABELS, ANONYMITY_THRESHOLD } from '@/lib/constants'
import type { RelationshipType } from '@/lib/types/database'
import { toast } from 'sonner'

interface UserInfo {
  id: string
  full_name: string
  email: string
}

interface Assignment {
  id: string
  reviewer_id: string
  subject_id: string
  relationship: RelationshipType
  completed_at: string | null
  reviewer: UserInfo
  subject: UserInfo
}

interface Warning {
  subject_id: string
  relationship: string
  count: number
}

export default function MatrixPage() {
  const params = useParams()
  const cycleId = params.cycleId as string
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [newReviewerId, setNewReviewerId] = useState('')
  const [newSubjectId, setNewSubjectId] = useState('')
  const [newRelationship, setNewRelationship] = useState<RelationshipType>('peer')

  const loadData = async () => {
    try {
      const data = await getAssignmentsForCycle(cycleId)
      const mapped = data.map((d) => ({
        id: d.id,
        reviewer_id: d.reviewer_id,
        subject_id: d.subject_id,
        relationship: d.relationship as RelationshipType,
        completed_at: d.completed_at,
        reviewer: d.reviewer as unknown as UserInfo,
        subject: d.subject as unknown as UserInfo,
      }))
      setAssignments(mapped)

      // Extract unique users from assignments
      const userMap = new Map<string, UserInfo>()
      for (const a of mapped) {
        if (!userMap.has(a.reviewer.id)) userMap.set(a.reviewer.id, a.reviewer)
        if (!userMap.has(a.subject.id)) userMap.set(a.subject.id, a.subject)
      }
      setUsers(Array.from(userMap.values()))

      const w = await getMatrixWarnings(cycleId)
      setWarnings(w)
    } catch (err) {
      toast.error('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [cycleId])

  const handleAdd = async () => {
    if (!newReviewerId || !newSubjectId) {
      toast.error('Select both a reviewer and a subject')
      return
    }
    try {
      await createAssignment({
        review_cycle_id: cycleId,
        reviewer_id: newReviewerId,
        subject_id: newSubjectId,
        relationship: newRelationship,
      })
      toast.success('Assignment added')
      setNewReviewerId('')
      setNewSubjectId('')
      await loadData()
    } catch (err) {
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

  // Get all users from Supabase for the dropdowns - we'll use the ones we know about
  // In a real scenario you'd fetch all users, but for a small team the assignment list covers it

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
                const subjectName = assignments.find(
                  (a) => a.subject_id === w.subject_id
                )?.subject.full_name ?? w.subject_id
                return (
                  <li key={i}>
                    {subjectName} - {RELATIONSHIP_LABELS[w.relationship]}: {w.count} reviewer{w.count === 1 ? '' : 's'}
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
            Enter user IDs or select from known users. New users must sign in first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 flex-1 min-w-[180px]">
              <label className="text-sm font-medium">Reviewer</label>
              {users.length > 0 ? (
                <Select value={newReviewerId} onValueChange={(v) => setNewReviewerId(v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <input
                  className="flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                  placeholder="User ID"
                  value={newReviewerId}
                  onChange={(e) => setNewReviewerId(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1 flex-1 min-w-[180px]">
              <label className="text-sm font-medium">Subject</label>
              {users.length > 0 ? (
                <Select value={newSubjectId} onValueChange={(v) => setNewSubjectId(v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <input
                  className="flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                  placeholder="User ID"
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1 min-w-[140px]">
              <label className="text-sm font-medium">Relationship</label>
              <Select value={newRelationship} onValueChange={(v) => v && setNewRelationship(v as RelationshipType)}>
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
                    <TableCell>{a.reviewer.full_name}</TableCell>
                    <TableCell>{a.subject.full_name}</TableCell>
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
