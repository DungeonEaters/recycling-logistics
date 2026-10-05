import { useMutation } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { login } from '../api/client'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/toast'
import { useAuth } from '../lib/auth-context'
import { getErrorMessage } from '../lib/format'

export function LoginPage() {
  const { token, login: saveLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [email, setEmail] = useState('admin@demo.cl')
  const [password, setPassword] = useState('admin123')
  const [inlineError, setInlineError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      saveLogin(data.access_token, data.user)
      toast({ title: 'Sesión iniciada', description: 'Bienvenido al panel admin.', variant: 'success' })
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
    },
    onError: (error) => {
      const message = getErrorMessage(error)
      setInlineError(message)
      toast({ title: 'No fue posible iniciar sesión', description: message, variant: 'error' })
    },
  })

  if (token) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setInlineError(null)
    mutation.mutate({ email, password })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Recycling Logistics</p>
          <CardTitle className="text-3xl">Ingreso administrador</CardTitle>
          <CardDescription>Gestiona clientes, rutas, camiones y reportes de trazabilidad.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Demo: <strong>admin@demo.cl</strong> / <strong>admin123</strong>
            </div>
            {inlineError ? <Alert>{inlineError}</Alert> : null}
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" fullWidth disabled={mutation.isPending}>
              {mutation.isPending ? 'Ingresando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
