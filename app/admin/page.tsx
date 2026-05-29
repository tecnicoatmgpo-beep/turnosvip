'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Store, CreditCard, Users, Shield, ArrowUpRight, Activity } from 'lucide-react'

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
    { 
      name: 'Total Comercios', 
      value: stats.totalTenants, 
      icon: Store, 
      desc: 'Registrados en el sistema',
      themeClass: 'border-amber-200/50 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700/50',
      iconBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
    },
    { 
      name: 'Comercios Activos', 
      value: stats.activeTenants, 
      icon: Users, 
      desc: 'Cuentas con acceso habilitado',
      themeClass: 'border-emerald-200/50 dark:border-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-700/50',
      iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
      activeIndicator: true
    },
    { 
      name: 'Planes de Suscripción', 
      value: stats.totalPlans, 
      icon: CreditCard, 
      desc: 'Opciones de membresía creadas',
      themeClass: 'border-indigo-200/50 dark:border-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700/50',
      iconBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
    },
  ]

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1.5 dark:text-primary-hover">
            <Activity className="w-3.5 h-3.5" />
            <span>Consola del Servidor Activo</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Resumen del Sistema</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Vista global del estado del SaaS multitenant.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-white dark:bg-card-custom border border-border-custom rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.name}
                className={`bg-white dark:bg-card-custom border ${card.themeClass} rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{card.name}</span>
                  <div className={`p-2.5 rounded-xl shrink-0 ${card.iconBg} transition-transform duration-200 hover:rotate-6`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">{card.value}</span>
                    <p className="text-xs text-zinc-400 mt-1 dark:text-zinc-500">{card.desc}</p>
                  </div>
                  {card.activeIndicator && (
                    <span className="flex h-2.5 w-2.5 mb-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Main Info Banner with Gradient Backing */}
      <div className="relative overflow-hidden bg-white dark:bg-card-custom border border-border-custom rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start gap-4">
        {/* Accent gradient shape behind icon */}
        <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-xl pointer-events-none" />

        <div className="p-3 bg-primary-light text-primary rounded-xl shrink-0">
          <Shield className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            Consola del Superadministrador
            <span className="text-[10px] px-2 py-0.5 font-bold rounded-full bg-primary-light text-primary tracking-wide uppercase">
              Master Control
            </span>
          </h2>
          <p className="text-sm text-zinc-650 dark:text-zinc-400 max-w-3xl leading-relaxed">
            Bienvenido al panel maestro. Desde aquí tienes control absoluto sobre el ciclo de vida del tenant, los slugs de enrutamiento y la configuración de planes de facturación.
            Los cambios realizados aquí afectan a la infraestructura del sistema y al acceso del usuario final.
          </p>
          <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-primary dark:text-primary-hover">
            <a href="/admin/tenants" className="flex items-center gap-1 hover:underline">
              Administrar Comercios
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <span className="text-zinc-300 dark:text-zinc-800">|</span>
            <a href="/admin/subscriptions" className="flex items-center gap-1 hover:underline">
              Gestionar Membresías
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
