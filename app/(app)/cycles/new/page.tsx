'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCycle } from '@/actions/cycles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function NewCyclePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const cycle = await createCycle(title.trim())
      toast.success('Cycle created')
      router.push(`/cycles/${cycle.id}`)
    } catch (err) {
      toast.error('Failed to create cycle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold mb-6">New Review Cycle</h2>
      <Card>
        <CardHeader>
          <CardTitle>Cycle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Q2 2026 Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'Creating...' : 'Create Cycle'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
