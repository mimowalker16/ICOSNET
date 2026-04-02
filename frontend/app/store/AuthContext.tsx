import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { MeUser } from '~/types'
import * as authLib from '~/lib/auth'

interface AuthContextType {
  user: MeUser | null
  isAdmin: boolean
  permissions: string[]
  hasPermission: (codename: string) => boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const permissions = user?.permissions ?? []
  const isAdmin = user?.role?.is_admin ?? false

  const hasPermission = useCallback(
    (codename: string) => isAdmin || permissions.includes(codename),
    [isAdmin, permissions],
  )

  useEffect(() => {
    const token = authLib.getStoredToken()
    if (token) {
      authLib.fetchMe()
        .then(setUser)
        .catch(() => authLib.logout())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const me = await authLib.login(username, password)
    setUser(me)
    navigate('/dashboard')
  }, [navigate])

  const logout = useCallback(() => {
    authLib.logout()
    setUser(null)
    navigate('/login')
  }, [navigate])

  return (
    <AuthContext.Provider value={{ user, isAdmin, permissions, hasPermission, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
