'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCycle } from '@/actions/cycles'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function DeleteCycleButton({ cycleId }: { cycleId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirming(true)}>
        Delete cycle
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Are you sure?</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true)
          try {
            await deleteCycle(cycleId)
            toast.success('Cycle deleted')
            router.push('/cycles')
          } catch {
            toast.error('Failed to delete cycle')
            setLoading(false)
          }
        }}
      >
        {loading ? 'Deleting...' : 'Yes, delete'}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  )
}
