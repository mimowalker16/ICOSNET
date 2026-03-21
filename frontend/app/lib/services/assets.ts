import client from '~/lib/client'
import type { Asset, StatusLog } from '~/types'

type Paginated<T> = { count: number; results: T[] }

export async function getAssets(params?: Record<string, string>) {
  const { data } = await client.get<Paginated<Asset> | Asset[]>('assets/', { params })
  return Array.isArray(data) ? data : data.results
}

export async function getAsset(id: number) {
  const { data } = await client.get<Asset>(`assets/${id}/`)
  return data
}

export async function createAsset(payload: Partial<Asset>) {
  const { data } = await client.post<Asset>('assets/', payload)
  return data
}

export async function updateAsset(id: number, payload: Partial<Asset>) {
  const { data } = await client.patch<Asset>(`assets/${id}/`, payload)
  return data
}

export async function deleteAsset(id: number) {
  await client.delete(`assets/${id}/`)
}

export async function getStatusHistory(id: number) {
  const { data } = await client.get<{ count: number; results: StatusLog[] } | StatusLog[]>(`assets/${id}/status-history/`)
  return Array.isArray(data) ? data : data.results
}
