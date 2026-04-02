import client from '~/lib/client'
import type { AppPermission, Role } from '~/types'

export async function getPermissions() {
  const { data } = await client.get<AppPermission[]>('permissions/')
  return data
}

export async function getRoles() {
  const { data } = await client.get<Role[]>('roles/')
  return data
}

export async function getRole(id: number) {
  const { data } = await client.get<Role>(`roles/${id}/`)
  return data
}

export async function createRole(payload: {
  name: string
  description?: string
  permission_ids: number[]
}) {
  const { data } = await client.post<Role>('roles/', payload)
  return data
}

export async function updateRole(
  id: number,
  payload: { name?: string; description?: string; permission_ids?: number[] },
) {
  const { data } = await client.patch<Role>(`roles/${id}/`, payload)
  return data
}

export async function deleteRole(id: number) {
  await client.delete(`roles/${id}/`)
}
