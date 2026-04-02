import { useAuth } from '~/store/AuthContext'
import { AccessDenied } from '~/components/AccessDenied'

interface Props {
  permission: string
  children: React.ReactNode
}

export function RequirePermission({ permission, children }: Props) {
  const { hasPermission } = useAuth()

  if (!hasPermission(permission)) {
    return <AccessDenied />
  }

  return <>{children}</>
}
