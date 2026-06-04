'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { autosaveResponse, submitReview } from '@/actions/responses'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Database } from '@/lib/types/database'

type Question = Database['public']['Tables']['questions']['Row']
type Response = Database['public']['Tables']['responses']['Row']

interface ReviewFormProps {
  assignmentId: string
  questions: Question[]
  existingResponses: Response[]
  isCompleted: boolean
}

export function ReviewForm({ assignmentId, questions, existingResponses, isCompleted }: ReviewFormProps) {
  const router = useRouter()
  const [responses, setResponses] = useState<Record<string, { open_text: string; rating_value: number | null }>>(() => {
    const initial: Record<string, { open_text: string; rating_value: number | null }> = {}
    for (const q of questions) {
      const existing = existingResponses.find((r) => r.question_id === q.id)
      initial[q.id] = {
        open_text: existing?.open_text ?? '',
        rating_value: existing?.rating_value ?? null,
      }
    }
    return initial
  })
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({})

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout)
    }
  }, [])

  const debouncedSave = useCallback(
    (questionId: string, openText: string, ratingValue: number | null) => {
      if (debounceTimers.current[questionId]) {
        clearTimeout(debounceTimers.current[questionId])
      }
      debounceTimers.current[questionId] = setTimeout(async () => {
        setSaving((prev) => ({ ...prev, [questionId]: true }))
        try {
          await autosaveResponse({
            assignment_id: assignmentId,
            question_id: questionId,
            open_text: openText || null,
            rating_value: ratingValue,
          })
        } catch {
          toast.error('Failed to save response')
        } finally {
          setSaving((prev) => ({ ...prev, [questionId]: false }))
        }
      }, 500)
    },
    [assignmentId]
  )

  const handleTextChange = (questionId: string, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], open_text: value },
    }))
    if (!isCompleted) {
      debouncedSave(questionId, value, responses[questionId]?.rating_value ?? null)
    }
  }

  const handleRatingChange = (questionId: string, value: number) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], rating_value: value },
    }))
    if (!isCompleted) {
      debouncedSave(questionId, responses[questionId]?.open_text ?? '', value)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Flush any pending saves
      Object.values(debounceTimers.current).forEach(clearTimeout)
      for (const q of questions) {
        const r = responses[q.id]
        if (r.open_text || r.rating_value !== null) {
          await autosaveResponse({
            assignment_id: assignmentId,
            question_id: q.id,
            open_text: r.open_text || null,
            rating_value: r.rating_value,
          })
        }
      }

      await submitReview(assignmentId)
      toast.success('Review submitted')
      router.push('/dashboard')
    } catch (err) {
      toast.error('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <Card key={q.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{q.question_text}</CardTitle>
              {saving[q.id] && (
                <Badge variant="outline" className="text-xs">Saving...</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {q.is_rating && (
              <div className="space-y-1">
                <Label>Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled={isCompleted}
                      onClick={() => handleRatingChange(q.id, val)}
                      className={`w-10 h-10 rounded-md border text-sm font-medium transition-colors ${
                        responses[q.id]?.rating_value === val
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      } ${isCompleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {q.is_open_ended && (
              <div className="space-y-1">
                <Label>Your response</Label>
                <Textarea
                  value={responses[q.id]?.open_text ?? ''}
                  onChange={(e) => handleTextChange(q.id, e.target.value)}
                  placeholder="Type your response..."
                  rows={4}
                  disabled={isCompleted}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {!isCompleted && (
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
          <p className="text-sm text-muted-foreground self-center">
            Your responses are saved automatically.
          </p>
        </div>
      )}
    </div>
  )
}
