import api from './api'
import type { User } from '@/types'

export const authService = {
  login: (username: string, password: string) =>
    api.post<{ access: string; refresh: string }>('/auth/login/', { username, password })
      .then((r) => r.data),

  me: () =>
    api.get<User>('/auth/me/').then((r) => r.data),

  refresh: (refresh: string) =>
    api.post<{ access: string }>('/auth/token/refresh/', { refresh }).then((r) => r.data),
}

export const userService = {
  list: () =>
    api.get<{ results: User[] }>('/users/').then((r) => r.data.results),

  create: (data: Partial<User> & { password: string }) =>
    api.post<User>('/users/', data).then((r) => r.data),

  update: (id: number, data: Partial<User>) =>
    api.patch<User>(`/users/${id}/`, data).then((r) => r.data),
}
