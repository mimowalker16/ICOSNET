import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { getAssets } from '~/lib/services/assets'
import { createIncident } from '~/lib/services/incidents'
import type { Asset } from '~/types'

export default function IncidentNew() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: () => getAssets(),
  })

  const mutation = useMutation({
    mutationFn: createIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      navigate('/incidents')
    },
    onError: () => setError('Failed to create incident'),
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    mutation.mutate({
      title: fd.get('title') as string,
      description: fd.get('description') as string,
      severity: fd.get('severity') as string,
      asset: fd.get('asset') ? Number(fd.get('asset')) : undefined,
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Incident</h1>
      <Card>
        <CardHeader><CardTitle>Incident Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="Brief description of the issue" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Detailed description of the incident..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Severity</Label>
                <Select name="severity" defaultValue="MEDIUM">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Related Asset</Label>
                <Select name="asset" defaultValue="">
                  <SelectTrigger><SelectValue placeholder="Select asset (optional)" /></SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating...' : 'Create Incident'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/incidents')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
