import { getCycles } from '@/actions/cycles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CYCLE_STATUS_LABELS } from '@/lib/constants'
import Link from 'next/link'

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  active: 'default',
  closed: 'secondary',
  results_published: 'secondary',
}

export default async function AdminPage() {
  const cycles = await getCycles()

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Review Cycles</h2>
        <Link href="/dashboard/admin/cycles/new">
          <Button>New Cycle</Button>
        </Link>
      </div>

      {cycles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No review cycles yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <Link key={cycle.id} href={`/dashboard/admin/cycles/${cycle.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{cycle.title}</CardTitle>
                    <Badge variant={statusVariant[cycle.status] || 'outline'}>
                      {CYCLE_STATUS_LABELS[cycle.status] || cycle.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Created {new Date(cycle.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Link href="/dashboard/admin/users">
        <Button variant="outline">Team Roster</Button>
      </Link>
    </div>
  )
}
