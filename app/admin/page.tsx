'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Store, CreditCard, Users, Shield } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalPlans: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClient()
        
        // Fetch tenants
        const { data: tenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, status')
        
        // Fetch plans
        const { data: plans, error: plansError } = await supabase
          .from('subscription_plans')
          .select('id')

        if (tenantsError || plansError) {
          throw new Error('Error al cargar estadísticas')
        }

        const totalTenants = tenants?.length || 0
        const activeTenants = tenants?.filter(t => t.status === 'active' || t.status === 'trial').length || 0
        const totalPlans = plans?.length || 0

        setStats({
          totalTenants,
          activeTenants,
          totalPlans,
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    { name: 'Total Comercios', value: stats.totalTenants, icon: Store, desc: 'Registrados en el sistema' },
    { name: 'Comercios Activos/Trial', value: stats.activeTenants, icon: Users, desc: 'Cuentas con acceso habilitado' },
    { name: 'Planes de Suscripción', value: stats.totalPlans, icon: CreditCard, desc: 'Opciones de membresía creadas' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Resumen del Sistema</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Vista global del estado del SaaS multitenant.</p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.name}
                className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-6 shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{card.name}</span>
                  <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{card.value}</span>
                  <p className="text-xs text-zinc-400 mt-1 dark:text-zinc-500">{card.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Main Info */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Consola del Superadministrador
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-2xl leading-relaxed">
          Bienvenido al panel maestro. Desde aquí tienes control absoluto sobre el ciclo de vida del tenant, los slugs de enrutamiento y la configuración de planes de facturación.
          Los cambios realizados aquí afectan a la infraestructura del sistema y al acceso del usuario final.
        </p>
      </div>
    </div>
  )
}
