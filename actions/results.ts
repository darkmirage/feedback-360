'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from './auth'
import type { RelationshipType } from '@/lib/types/database'

interface AggregatedGroup {
  relationship: RelationshipType
  responseCount: number
  questions: Array<{
    question_id: string
    question_text: string
    question_order: number
    openTextResponses: string[]
    averageRating: number | null
  }>
}

export interface SubjectResults {
  subject_email: string
  subject_name: string
  groups: AggregatedGroup[]
  byQuestion: Array<{
    question_id: string
    question_text: string
    question_order: number
    is_rating: boolean
    overallAverageRating: number | null
    taggedResponses: Array<{ relationship: string; text: string }>
  }>
}

export async function getResultsForSubject(cycleId: string, subjectEmail: string) {
  const user = await requireAuth()
  const isAdmin = user.role === 'admin'
  const isSelf = user.email.toLowerCase() === subjectEmail.toLowerCase()

  if (!isAdmin && !isSelf) {
    throw new Error('You can only view your own results')
  }

  const admin = createAdminClient()

  // Verify cycle status — admin can view when closed or published, subjects only when published
  const { data: cycle, error: cycleError } = await admin
    .from('review_cycles')
    .select('status')
    .eq('id', cycleId)
    .single()

  if (cycleError || !cycle) throw new Error('Cycle not found')
  if (!isAdmin && cycle.status !== 'results_published') {
    throw new Error('Results are not yet published')
  }
  if (isAdmin && cycle.status === 'draft') {
    throw new Error('Cycle must be active, closed, or published to view results')
  }

  // Get all completed assignments for this subject in this cycle
  const { data: assignments, error: assignError } = await admin
    .from('review_assignments')
    .select('id, relationship, completed_at')
    .eq('review_cycle_id', cycleId)
    .eq('subject_email', subjectEmail.toLowerCase())
    .not('completed_at', 'is', null)

  if (assignError) throw new Error(assignError.message)

  // Get questions for this cycle
  const { data: questions, error: questError } = await admin
    .from('questions')
    .select('*')
    .eq('review_cycle_id', cycleId)
    .order('question_order')

  if (questError) throw new Error(questError.message)

  // Group assignments by relationship
  const byRelationship: Record<string, string[]> = {}
  for (const a of assignments) {
    const rel = a.relationship as string
    if (!byRelationship[rel]) byRelationship[rel] = []
    byRelationship[rel].push(a.id)
  }

  const groups: AggregatedGroup[] = []

  for (const [relationship, assignmentIds] of Object.entries(byRelationship)) {
    // Get all responses for these assignments
    const { data: responses, error: respError } = await admin
      .from('responses')
      .select('*')
      .in('assignment_id', assignmentIds)

    if (respError) throw new Error(respError.message)

    const questionResults = questions.map((q) => {
      const qResponses = responses.filter((r) => r.question_id === q.id)
      const openTexts = qResponses
        .map((r) => r.open_text)
        .filter((t): t is string => !!t && t.trim().length > 0)
      const ratings = qResponses
        .map((r) => r.rating_value)
        .filter((r): r is number => r !== null)

      return {
        question_id: q.id,
        question_text: q.question_text,
        question_order: q.question_order,
        openTextResponses: openTexts,
        averageRating: ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null,
      }
    })

    groups.push({
      relationship: relationship as RelationshipType,
      responseCount: assignmentIds.length,
      questions: questionResults,
    })
  }

  // Get subject name from people table
  const { data: person } = await admin
    .from('people')
    .select('first_name, last_name')
    .eq('email', subjectEmail.toLowerCase())
    .single()

  const subjectName = person
    ? `${person.first_name} ${person.last_name}`.trim() || subjectEmail
    : subjectEmail

  // Build question-first view with tagged responses across all groups
  const byQuestion = questions.map((q) => {
    const taggedResponses: Array<{ relationship: string; text: string }> = []
    let allRatings: number[] = []

    for (const group of groups) {
      const gq = group.questions.find((gq) => gq.question_id === q.id)
      if (!gq) continue
      for (const text of gq.openTextResponses) {
        taggedResponses.push({ relationship: group.relationship, text })
      }
      if (gq.averageRating !== null) {
        // Collect raw ratings for overall average
        const groupAssignmentIds = byRelationship[group.relationship] ?? []
        allRatings = allRatings.concat(
          gq.openTextResponses.length > 0 || gq.averageRating !== null
            ? Array(groupAssignmentIds.length).fill(gq.averageRating)
            : []
        )
      }
    }

    // Compute overall average from all individual ratings across groups
    let overallRatings: number[] = []
    for (const group of groups) {
      const gq = group.questions.find((gq) => gq.question_id === q.id)
      if (!gq || gq.averageRating === null) continue
      // Weight by group size
      overallRatings.push(gq.averageRating * group.responseCount)
    }
    const totalResponders = groups.reduce((sum, g) => {
      const gq = g.questions.find((gq) => gq.question_id === q.id)
      return sum + (gq?.averageRating !== null ? g.responseCount : 0)
    }, 0)
    const overallAverage = totalResponders > 0
      ? Math.round((overallRatings.reduce((a, b) => a + b, 0) / totalResponders) * 10) / 10
      : null

    return {
      question_id: q.id,
      question_text: q.question_text,
      question_order: q.question_order,
      is_rating: q.is_rating,
      overallAverageRating: overallAverage,
      taggedResponses,
    }
  })

  return {
    subject_email: subjectEmail,
    subject_name: subjectName,
    groups,
    byQuestion,
  }
}

export async function getAllSubjectResults(cycleId: string) {
  const user = await requireAuth()
  if (user.role !== 'admin') throw new Error('Admin only')

  const admin = createAdminClient()

  // Get all unique subjects in this cycle
  const { data: assignments, error } = await admin
    .from('assignment_details')
    .select('subject_email, subject_name')
    .eq('review_cycle_id', cycleId)

  if (error) throw new Error(error.message)

  const uniqueSubjects = new Map<string, string>()
  for (const a of assignments) {
    if (!uniqueSubjects.has(a.subject_email)) {
      uniqueSubjects.set(a.subject_email, a.subject_name ?? a.subject_email)
    }
  }

  return Array.from(uniqueSubjects.entries()).map(([email, name]) => ({
    email,
    full_name: name,
  }))
}
