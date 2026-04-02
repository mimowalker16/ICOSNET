import { ShieldX } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'

export function AccessDenied() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-20">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <ShieldX className="h-10 w-10 text-destructive" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You don't have the required permissions to view this page. Contact your administrator if you believe this is an error.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  )
}
