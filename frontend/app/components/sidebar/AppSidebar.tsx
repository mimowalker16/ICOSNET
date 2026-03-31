"use client"

import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  BarChart3,
  Settings,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '~/components/ui/sidebar'
import { NavMain } from '~/components/sidebar/NavMain'
import { NavUser } from '~/components/sidebar/NavUser'
import { useAuth } from '~/store/AuthContext'

const navItems = [
  { title: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { title: 'Assets', to: '/assets', icon: Server },
  { title: 'Incidents', to: '/incidents', icon: AlertTriangle },
  { title: 'Analytics', to: '/analytics', icon: BarChart3 },
]

const adminItems = [
  { title: 'Settings', to: '/settings', icon: Settings },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isAdmin } = useAuth()
  const items = isAdmin ? [...navItems, ...adminItems] : navItems

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <a href="/dashboard" className="flex items-center justify-center p-2 group-data-[collapsible=icon]:hidden">
          <img
            src="/icosnet.svg"
            alt="ICOSNET"
            className="h-10 w-auto object-contain"
          />
        </a>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
