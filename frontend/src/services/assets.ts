import api from './api'
import type { Asset, AssetStatusLog, Paginated } from '@/types'

export const assetService = {
  list: (params?: Record<string, string>) =>
    api.get<Paginated<Asset>>('/assets/', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<Asset>(`/assets/${id}/`).then((r) => r.data),

  create: (data: Partial<Asset>) =>
    api.post<Asset>('/assets/', data).then((r) => r.data),

  update: (id: number, data: Partial<Asset>) =>
    api.patch<Asset>(`/assets/${id}/`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/assets/${id}/`),

  statusHistory: (id: number) =>
    api.get<Paginated<AssetStatusLog>>(`/assets/${id}/status-history/`).then((r) => r.data),
}
