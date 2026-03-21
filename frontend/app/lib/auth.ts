import client from '~/lib/client'

export async function login(username: string, password: string) {
  const { data } = await client.post('auth/login/', { username, password })
  localStorage.setItem('access_token', data.access)
  localStorage.setItem('refresh_token', data.refresh)
  return fetchMe()
}

export async function fetchMe() {
  const { data } = await client.get('auth/me/')
  return data
}

export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export function getStoredToken() {
  return localStorage.getItem('access_token')
}
