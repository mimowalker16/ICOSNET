import { type RouteConfig, route, layout, index } from '@react-router/dev/routes'

export default [
  route('login', 'routes/login.tsx'),
  layout('components/AppLayout.tsx', [
    index('routes/dashboard.tsx'),
    route('dashboard', 'routes/dashboard.tsx', { id: 'dashboard-named' }),
    route('assets', 'routes/assets._index.tsx'),
    route('assets/new', 'routes/assets.new.tsx'),
    route('assets/:id', 'routes/assets.$id.tsx'),
    route('incidents', 'routes/incidents._index.tsx'),
    route('incidents/new', 'routes/incidents.new.tsx'),
    route('incidents/:id', 'routes/incidents.$id.tsx'),
    route('analytics', 'routes/analytics.tsx'),
    route('settings', 'routes/settings.tsx'),
  ]),
] satisfies RouteConfig
