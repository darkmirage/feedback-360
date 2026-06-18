'use client'

import { useEffect, useState, useRef } from 'react'
import { getCurrentUser } from '@/actions/auth'
import { getPeople, addPerson, importPeopleCSV, deletePerson } from '@/actions/people'
import { getUsers, updateUserRole } from '@/actions/users'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { UserRole } from '@/lib/types/database'

interface Person {
  id: string
  email: string
  first_name: string
  last_name: string
}

interface UserEntry {
  id: string
  email: string
  full_name: string
  role: UserRole
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  user: 'User',
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  user: '',
}

export default function RosterPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [users, setUsers] = useState<UserEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadPeople = async () => {
    try {
      const [data, user] = await Promise.all([getPeople(), getCurrentUser()])
      setPeople(data as Person[])
      const admin = user?.role === 'admin'
      setIsAdmin(admin ?? false)
      if (admin) {
        const userData = await getUsers()
        setUsers(userData as UserEntry[])
      }
    } catch {
      toast.error('Failed to load roster')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPeople() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !firstName.trim()) {
      toast.error('First name and email are required')
      return
    }
    setAdding(true)
    try {
      await addPerson({ email, first_name: firstName, last_name: lastName })
      toast.success('Person added')
      setFirstName('')
      setLastName('')
      setEmail('')
      await loadPeople()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add person')
    } finally {
      setAdding(false)
    }
  }

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length < 2) {
      toast.error('CSV must have a header row and at least one data row')
      return
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim())
    const emailIdx = header.findIndex((h) => h === 'email')
    const firstIdx = header.findIndex((h) => h === 'first_name' || h === 'first name' || h === 'firstname')
    const lastIdx = header.findIndex((h) => h === 'last_name' || h === 'last name' || h === 'lastname')

    if (emailIdx === -1) {
      toast.error('CSV must have an "email" column')
      return
    }

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim())
      return {
        email: cols[emailIdx] || '',
        first_name: firstIdx >= 0 ? cols[firstIdx] || '' : '',
        last_name: lastIdx >= 0 ? cols[lastIdx] || '' : '',
      }
    })

    try {
      const count = await importPeopleCSV(rows)
      toast.success(`Imported ${count} people`)
      await loadPeople()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import CSV')
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePerson(id)
      toast.success('Person removed')
      await loadPeople()
    } catch {
      toast.error('Failed to remove person')
    }
  }

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      await updateUserRole(userId, role)
      toast.success('Role updated')
      const userData = await getUsers()
      setUsers(userData as UserEntry[])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Roster</h2>
          <p className="text-muted-foreground">
            Add your team members here. They&apos;ll be available for review assignments across all cycles.
          </p>
        </div>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Person</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1 min-w-[140px]">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                />
              </div>
              <div className="space-y-1 min-w-[140px]">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-[200px]">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
              <Button type="submit" disabled={adding}>
                {adding ? 'Adding...' : 'Add'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import CSV</CardTitle>
            <CardDescription>
              Upload a CSV with columns: <code className="text-xs bg-muted px-1 py-0.5 rounded">first_name, last_name, email</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSV}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose CSV file
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {people.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No team members yet. Add people individually or import a CSV.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Email</TableHead>
                  {isAdmin && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.first_name || '—'}</TableCell>
                    <TableCell>{person.last_name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{person.email}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(person.id)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isAdmin && users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Roles</CardTitle>
            <CardDescription>
              Manage platform access. Managers can create and run their own review cycles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ROLE_COLORS[u.role]}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="text-sm border rounded px-2 py-1 bg-background"
                      >
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
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
