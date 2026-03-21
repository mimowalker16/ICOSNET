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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-xs">
                  IC
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ICOSNET ITSM</span>
                  <span className="truncate text-xs text-muted-foreground">Supervision Platform</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
