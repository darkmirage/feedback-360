import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/actions/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function UsersPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('full_name')

  if (error) throw new Error(error.message)

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Team Members</h2>
      <p className="text-muted-foreground">
        Users appear here after signing in with Google for the first time.
      </p>

      <Card>
        <CardContent className="pt-6">
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No users have signed in yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
