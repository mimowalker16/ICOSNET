import client from '~/lib/client'
import type { NotificationSettings } from '~/types'

export async function getNotificationSettings() {
  const { data } = await client.get<NotificationSettings>('notifications/settings/')
  return data
}

export async function updateNotificationSettings(payload: Partial<Omit<NotificationSettings, 'updated_at'>>) {
  const { data } = await client.put<NotificationSettings>('notifications/settings/', payload)
  return data
}
