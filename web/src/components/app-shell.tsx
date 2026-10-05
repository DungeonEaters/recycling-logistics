import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

const items = [
  { to: '/', label: 'Dashboard' },
  { to: '/clientes', label: 'Clientes y puntos' },
  { to: '/camiones', label: 'Camiones y conductores' },
  { to: '/rutas', label: 'Rutas' },
  { to: '/trazabilidad', label: 'Trazabilidad' },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-950 px-5 py-6 text-slate-100 md:border-b-0 md:border-r">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">MVP B2B</p>
            <h1 className="mt-2 text-2xl font-semibold">Recycling Logistics</h1>
            <p className="mt-2 text-sm text-slate-300">Operación y trazabilidad de recolección de plásticos.</p>
          </div>

          <nav className="grid gap-2">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white',
                    isActive && 'bg-blue-600 text-white shadow-lg shadow-blue-950/20',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email} · Administrador</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Cerrar sesión
            </Button>
          </header>
          <main className="p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
