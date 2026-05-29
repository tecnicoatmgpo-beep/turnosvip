'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Shield, AlertCircle } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'unauthorized') {
      setErrorMsg('No tienes permisos de Superadministrador para acceder a esta área.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data?.user) {
        // Query users table to verify role is 'superadmin'
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profileError || !profile || profile.role !== 'superadmin') {
          await supabase.auth.signOut()
          throw new Error('Acceso restringido. Solo superadministradores.')
        }

        router.push('/admin')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Input
        label="Correo electrónico"
        type="email"
        placeholder="admin@miturnovip.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />

      <Input
        label="Contraseña"
        type="password"
        placeholder="••••••••"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />

      <Button type="submit" className="w-full justify-center" disabled={loading}>
        {loading ? 'Iniciando sesión...' : 'Ingresar al Panel'}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-xs p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">Mi Turno VIP</h2>
          <p className="text-sm text-zinc-500 mt-1 dark:text-zinc-400">Panel de control del Superadministrador</p>
        </div>

        <Suspense fallback={<p className="text-center text-sm text-zinc-500">Cargando...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
