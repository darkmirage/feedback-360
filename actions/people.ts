'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from './auth'
import { revalidatePath } from 'next/cache'

export async function getPeople() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .order('first_name')

  if (error) throw new Error(error.message)
  return data
}

export async function addPerson(params: {
  email: string
  first_name: string
  last_name: string
}) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('people')
    .insert({
      email: params.email.toLowerCase().trim(),
      first_name: params.first_name.trim(),
      last_name: params.last_name.trim(),
    })

  if (error) {
    if (error.code === '23505') throw new Error('A person with this email already exists')
    throw new Error(error.message)
  }
  revalidatePath('/dashboard/admin/users')
}

export async function importPeopleCSV(rows: Array<{ email: string; first_name: string; last_name: string }>) {
  await requireAdmin()
  const supabase = await createClient()

  const cleaned = rows
    .filter((r) => r.email && r.email.includes('@'))
    .map((r) => ({
      email: r.email.toLowerCase().trim(),
      first_name: r.first_name?.trim() ?? '',
      last_name: r.last_name?.trim() ?? '',
    }))

  if (cleaned.length === 0) throw new Error('No valid rows found in CSV')

  const { error } = await supabase
    .from('people')
    .upsert(cleaned, { onConflict: 'email' })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/admin/users')
  return cleaned.length
}

export async function deletePerson(personId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', personId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/admin/users')
}

export async function updatePerson(personId: string, params: {
  first_name?: string
  last_name?: string
}) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('people')
    .update({
      ...(params.first_name !== undefined && { first_name: params.first_name.trim() }),
      ...(params.last_name !== undefined && { last_name: params.last_name.trim() }),
    })
    .eq('id', personId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/admin/users')
}
