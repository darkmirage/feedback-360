'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getQuestions, upsertQuestion, deleteQuestion } from '@/actions/questions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Question {
  id?: string
  question_text: string
  question_order: number
  is_open_ended: boolean
  is_rating: boolean
}

export default function QuestionsPage() {
  const params = useParams()
  const cycleId = params.cycleId as string
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getQuestions(cycleId).then((data) => {
      setQuestions(data.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        question_order: q.question_order,
        is_open_ended: q.is_open_ended,
        is_rating: q.is_rating,
      })))
      setLoading(false)
    })
  }, [cycleId])

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        question_order: questions.length + 1,
        is_open_ended: true,
        is_rating: false,
      },
    ])
  }

  const updateQuestion = (index: number, field: keyof Question, value: string | boolean | number) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const removeQuestion = async (index: number) => {
    const q = questions[index]
    if (q.id) {
      try {
        await deleteQuestion(q.id, cycleId)
        toast.success('Question deleted')
      } catch {
        toast.error('Failed to delete question')
        return
      }
    }
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const saveAll = async () => {
    setLoading(true)
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        await upsertQuestion({
          id: q.id,
          review_cycle_id: cycleId,
          question_text: q.question_text,
          question_order: i + 1,
          is_open_ended: q.is_open_ended,
          is_rating: q.is_rating,
        })
      }
      toast.success('Questions saved')
      router.push(`/dashboard/admin/cycles/${cycleId}`)
    } catch {
      toast.error('Failed to save questions')
    } finally {
      setLoading(false)
    }
  }

  if (loading && questions.length === 0) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Edit Questions</h2>
        <Button onClick={addQuestion} variant="outline">Add Question</Button>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No questions yet. Add your first question.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <Card key={q.id || `new-${i}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">
                  Question {i + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor={`q-${i}`}>Question text</Label>
                  <Input
                    id={`q-${i}`}
                    value={q.question_text}
                    onChange={(e) => updateQuestion(i, 'question_text', e.target.value)}
                    placeholder="Enter your question..."
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={q.is_rating}
                      onChange={(e) => updateQuestion(i, 'is_rating', e.target.checked)}
                    />
                    Include rating (1-5)
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive ml-auto"
                    onClick={() => removeQuestion(i)}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={saveAll} disabled={loading}>
          {loading ? 'Saving...' : 'Save Questions'}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
