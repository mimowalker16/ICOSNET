import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, AlertCircle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Checkbox } from '~/components/ui/checkbox'
import { TablePagination } from '~/components/ui/table-pagination'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { useAuth } from '~/store/AuthContext'
import { AccessDenied } from '~/components/AccessDenied'
import { getUsers, createUser, updateUser } from '~/lib/services/users'
import { getNotificationSettings, updateNotificationSettings } from '~/lib/services/notifications'
import { getRoles, getPermissions, createRole, updateRole, deleteRole } from '~/lib/services/roles'
import type { User, Role, AppPermission } from '~/types'

export default function SettingsPage() {
  const { hasPermission } = useAuth()

  if (!hasPermission('manage_users')) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <RolesSection />
      <Separator />
      <UsersSection />
      <Separator />
      <NotificationsSection />
    </div>
  )
}

function RolesSection() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [error, setError] = useState('')
  const [selectedPerms, setSelectedPerms] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: getRoles,
  })

  const { data: permissions = [] } = useQuery<AppPermission[]>({
    queryKey: ['permissions'],
    queryFn: getPermissions,
  })

  const totalPages = Math.ceil(roles.length / PAGE_SIZE)
  const paginatedRoles = roles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const createMut = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setOpen(false)
      setError('')
      setSelectedPerms([])
    },
    onError: () => setError('Failed to create role'),
  })

  const editMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateRole>[1] }) =>
      updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditRole(null)
      setSelectedPerms([])
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    createMut.mutate({
      name: fd.get('name') as string,
      description: fd.get('description') as string,
      permission_ids: selectedPerms,
    })
  }

  function openEditDialog(role: Role) {
    setEditRole(role)
    setSelectedPerms(role.permissions.map((p) => p.id))
  }

  function togglePerm(id: number) {
    setSelectedPerms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Roles</CardTitle>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSelectedPerms([]); setError('') } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus /> Add Role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Role</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="role_name">Name</Label>
                <Input id="role_name" name="name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role_description">Description</Label>
                <Input id="role_description" name="description" />
              </div>
              <div className="grid gap-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded border p-3">
                  {permissions.map((perm) => (
                    <div key={perm.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`perm-${perm.id}`}
                        checked={selectedPerms.includes(perm.id)}
                        onCheckedChange={() => togglePerm(perm.id)}
                      />
                      <Label htmlFor={`perm-${perm.id}`} className="text-sm font-normal cursor-pointer">
                        {perm.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={createMut.isPending}>
                {createMut.isPending ? 'Creating...' : 'Create Role'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRoles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">
                  {role.name}
                  {role.is_admin && <Badge className="ml-2 bg-amber-600">Admin</Badge>}
                  {role.is_system && <Badge variant="outline" className="ml-2">System</Badge>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{role.description}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {role.is_admin ? (
                      <Badge variant="secondary">All permissions</Badge>
                    ) : (
                      role.permissions.map((p) => (
                        <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(role)} disabled={role.is_system}>
                      <Pencil />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMut.mutate(role.id)}
                      disabled={role.is_system || deleteMut.isPending}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </CardContent>

      {/* Edit Role Dialog */}
      <Dialog open={!!editRole} onOpenChange={(o) => { if (!o) { setEditRole(null); setSelectedPerms([]) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Role</DialogTitle></DialogHeader>
          {editRole && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                editMut.mutate({
                  id: editRole.id,
                  payload: {
                    name: fd.get('name') as string,
                    description: fd.get('description') as string,
                    permission_ids: selectedPerms,
                  },
                })
              }}
              className="space-y-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="edit_role_name">Name</Label>
                <Input id="edit_role_name" name="name" required defaultValue={editRole.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_role_description">Description</Label>
                <Input id="edit_role_description" name="description" defaultValue={editRole.description} />
              </div>
              <div className="grid gap-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded border p-3">
                  {permissions.map((perm) => (
                    <div key={perm.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-perm-${perm.id}`}
                        checked={selectedPerms.includes(perm.id)}
                        onCheckedChange={() => togglePerm(perm.id)}
                      />
                      <Label htmlFor={`edit-perm-${perm.id}`} className="text-sm font-normal cursor-pointer">
                        {perm.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              {editMut.isError && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>Failed to save changes</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={editMut.isPending}>
                {editMut.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function UsersSection() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [editUser, setEditUser] = useState<User | null>(null)
  const [page, setPage] = useState(1)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [editSelectedRole, setEditSelectedRole] = useState<string>('')
  const PAGE_SIZE = 10

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: getRoles,
  })

  const totalPages = Math.ceil(users.length / PAGE_SIZE)
  const paginatedUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setOpen(false)
      setError('')
      setSelectedRole('')
    },
    onError: () => setError('Failed to create user'),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateUser(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const editMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditUser(null)
      setEditSelectedRole('')
    },
  })

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    createMut.mutate({
      username: fd.get('username') as string,
      email: fd.get('email') as string,
      password: fd.get('password') as string,
      role: Number(selectedRole),
      first_name: fd.get('first_name') as string,
      last_name: fd.get('last_name') as string,
    })
  }

  function openEdit(user: User) {
    setEditUser(user)
    setEditSelectedRole(String(user.role.id))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Users</CardTitle>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSelectedRole(''); setError('') } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus /> Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" name="first_name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" name="last_name" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required minLength={6} />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
              <Button type="submit" className="w-full" disabled={createMut.isPending}>
                {createMut.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell><Badge variant="outline">{user.role.name}</Badge></TableCell>
                <TableCell>
                  <Badge className={user.is_active ? 'bg-green-600' : 'bg-gray-400'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleMut.mutate({ id: user.id, is_active: !user.is_active })}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </CardContent>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) { setEditUser(null); setEditSelectedRole('') } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          {editUser && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                editMut.mutate({
                  id: editUser.id,
                  payload: {
                    email: fd.get('email') as string,
                    first_name: fd.get('first_name') as string,
                    last_name: fd.get('last_name') as string,
                    role: Number(editSelectedRole),
                  },
                })
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input id="edit_first_name" name="first_name" defaultValue={editUser.first_name} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input id="edit_last_name" name="last_name" defaultValue={editUser.last_name} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input id="edit_email" name="email" type="email" required defaultValue={editUser.email} />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={editSelectedRole} onValueChange={setEditSelectedRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editMut.isError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>Failed to save changes</AlertDescription>
              </Alert>
            )}
              <Button type="submit" className="w-full" disabled={editMut.isPending}>
                {editMut.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function NotificationsSection() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: getNotificationSettings,
  })

  const saveMut = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(['notification-settings'], updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const smtpPort = fd.get('smtp_port')
    saveMut.mutate({
      smtp_host: fd.get('smtp_host') as string,
      smtp_port: smtpPort ? Number(smtpPort) : undefined,
      smtp_user: fd.get('smtp_user') as string,
      from_email: fd.get('from_email') as string,
      slack_webhook_url: fd.get('slack_webhook_url') as string,
      teams_webhook_url: fd.get('teams_webhook_url') as string,
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Notification Settings</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="slack_webhook_url">Slack Webhook URL</Label>
            <Input id="slack_webhook_url" name="slack_webhook_url" placeholder="https://hooks.slack.com/services/..." defaultValue={settings?.slack_webhook_url ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="teams_webhook_url">Teams Webhook URL</Label>
            <Input id="teams_webhook_url" name="teams_webhook_url" placeholder="https://outlook.office.com/webhook/..." defaultValue={settings?.teams_webhook_url ?? ''} />
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label htmlFor="smtp_host">SMTP Host</Label>
            <Input id="smtp_host" name="smtp_host" placeholder="smtp.gmail.com" defaultValue={settings?.smtp_host ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="smtp_port">SMTP Port</Label>
              <Input id="smtp_port" name="smtp_port" type="number" placeholder="587" defaultValue={settings?.smtp_port ?? 587} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="smtp_user">SMTP User</Label>
              <Input id="smtp_user" name="smtp_user" type="email" placeholder="alerts@icosnet.dz" defaultValue={settings?.smtp_user ?? ''} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="from_email">From Email</Label>
            <Input id="from_email" name="from_email" type="email" placeholder="supervision@icosnet.dz" defaultValue={settings?.from_email ?? ''} />
          </div>
          <Button type="submit" disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving...' : saved ? 'Saved!' : 'Save Notification Settings'}
          </Button>
          {saveMut.isError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>Failed to save settings</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
