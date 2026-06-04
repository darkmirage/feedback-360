'use client'

import { useState } from 'react'
import { transitionCycle } from '@/actions/cycles'
import { Button } from '@/components/ui/button'
import { VALID_TRANSITIONS, CYCLE_STATUS_LABELS } from '@/lib/constants'
import type { ReviewCycleStatus } from '@/lib/types/database'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function CycleTransitionButton({
  cycleId,
  currentStatus,
}: {
  cycleId: string
  currentStatus: ReviewCycleStatus
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const nextStatus = VALID_TRANSITIONS[currentStatus]

  if (!nextStatus) return null

  const handleTransition = async () => {
    setLoading(true)
    try {
      await transitionCycle(cycleId, currentStatus)
      toast.success(`Cycle advanced to ${CYCLE_STATUS_LABELS[nextStatus]}`)
      router.refresh()
    } catch (err) {
      toast.error('Failed to transition cycle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleTransition} disabled={loading}>
      {loading ? 'Updating...' : `Advance to ${CYCLE_STATUS_LABELS[nextStatus]}`}
    </Button>
  )
}
