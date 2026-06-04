'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { revertCycleToDraft } from '@/actions/cycles'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function RevertCycleButton({ cycleId }: { cycleId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          await revertCycleToDraft(cycleId)
          toast.success('Cycle reverted to draft')
          router.refresh()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to revert')
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? 'Reverting...' : 'Revert to Draft'}
    </Button>
  )
}
