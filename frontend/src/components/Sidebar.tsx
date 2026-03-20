import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Server, AlertTriangle, BarChart2,
  Users, Bell, LogOut, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/store/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/assets',     label: 'Assets',     icon: Server },
  { to: '/incidents',  label: 'Incidents',  icon: AlertTriangle },
  { to: '/analytics',  label: 'Analytics',  icon: BarChart2 },
]

const adminItems = [
  { to: '/settings/users',         label: 'Users',          icon: Users },
  { to: '/settings/notifications', label: 'Notifications',  icon: Bell },
]

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="w-60 min-h-screen bg-[var(--color-sidebar)] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-[var(--color-brand-light)]" size={22} />
          <span className="text-white font-bold text-lg tracking-tight">icosnet</span>
        </div>
        <p className="text-xs text-[var(--color-sidebar-text)] mt-0.5 pl-0.5">IT Supervision</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-[var(--color-brand)] text-white'
                : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white',
            )}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <p className="px-3 pt-4 pb-1 text-xs text-slate-500 uppercase tracking-widest font-semibold">
              Admin
            </p>
            {adminItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white',
                )}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm text-white font-medium truncate">{user?.username}</p>
          <p className="text-xs text-[var(--color-sidebar-text)] capitalize">{user?.role?.toLowerCase()}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
