import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { createAsset } from '~/lib/services/assets'

export default function AssetNew() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      navigate('/assets')
    },
    onError: () => setError('Failed to create asset'),
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    mutation.mutate({
      name: fd.get('name') as string,
      ip_address_or_url: fd.get('ip_address_or_url') as string,
      asset_type: fd.get('asset_type') as 'SERVER' | 'ROUTER' | 'API',
      check_type: fd.get('check_type') as 'PING' | 'TCP' | 'HTTP_GET',
      check_port: fd.get('check_port') ? Number(fd.get('check_port')) : null,
      check_interval_minutes: Number(fd.get('check_interval_minutes')) || 5,
      description: fd.get('description') as string,
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Add Asset</h1>
      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="e.g. Web Server 01" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ip_address_or_url">IP Address or URL</Label>
              <Input id="ip_address_or_url" name="ip_address_or_url" required placeholder="192.168.1.1 or https://api.example.com" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Asset Type</Label>
                <Select name="asset_type" defaultValue="SERVER">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVER">Server</SelectItem>
                    <SelectItem value="ROUTER">Router</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Check Type</Label>
                <Select name="check_type" defaultValue="PING">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PING">Ping</SelectItem>
                    <SelectItem value="TCP">TCP</SelectItem>
                    <SelectItem value="HTTP_GET">HTTP GET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="check_port">Port (optional)</Label>
                <Input id="check_port" name="check_port" type="number" placeholder="80" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="check_interval_minutes">Interval (min)</Label>
                <Input id="check_interval_minutes" name="check_interval_minutes" type="number" defaultValue={5} min={1} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="Optional description" />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating...' : 'Create Asset'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/assets')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
