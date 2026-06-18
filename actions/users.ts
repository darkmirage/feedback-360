'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from './auth'
import type { UserRole } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'

export async function getUsers() {
  await requireAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('users')
    .select('id, email, full_name, role')
    .order('full_name')

  if (error) throw new Error(error.message)
  return data
}

export async function updateUserRole(userId: string, role: UserRole) {
  const user = await requireAdmin()

  if (userId === user.id) {
    throw new Error('You cannot change your own role')
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('users')
    .update({ role })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/team')
}
