import client from '~/lib/client'
import type { User } from '~/types'

export async function getUsers() {
  const { data } = await client.get<{ count: number; results: User[] } | User[]>('users/')
  return Array.isArray(data) ? data : data.results
}

export async function getUser(id: number) {
  const { data } = await client.get<User>(`users/${id}/`)
  return data
}

export async function createUser(payload: {
  username: string
  email: string
  password: string
  role: number
  first_name?: string
  last_name?: string
}) {
  const { data } = await client.post<User>('users/', payload)
  return data
}

export async function getUsersByPermission(codename: string) {
  const { data } = await client.get<{ count: number; results: User[] } | User[]>(`users/?permission=${codename}`)
  return Array.isArray(data) ? data : data.results
}

export async function updateUser(id: number, payload: Partial<User>) {
  const { data } = await client.patch<User>(`users/${id}/`, payload)
  return data
}
