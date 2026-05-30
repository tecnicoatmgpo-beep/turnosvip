'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Calendar, Scissors, Sparkles, DollarSign, Clock } from 'lucide-react'

interface Appointment {
  id: string
  client_name: string
  client_phone: string
  appointment_time: string
  status: string
  total_price: number
  services?: {
    name: string
  } | null
  users?: {
    email: string
  } | null
}

export default function TenantDashboard() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todayCount: 0,
    todayRevenue: 0,
    servicesCount: 0,
  })
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const supabase = createClient()

        // 1. Get Tenant ID from Slug
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .single()

        if (!tenant) return

        const tenantId = tenant.id

        // 2. Fetch Services Count
        const { count: sCount } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)

        // 3. Fetch Today's Appointments
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)

        const { data: todayAppts } = await supabase
          .from('appointments')
          .select('total_price, status')
          .eq('tenant_id', tenantId)
          .gte('appointment_time', todayStart.toISOString())
          .lte('appointment_time', todayEnd.toISOString())

        const todayCount = todayAppts?.length || 0
        const todayRevenue = todayAppts
          ?.filter(a => a.status !== 'canceled')
          ?.reduce((sum, a) => sum + Number(a.total_price), 0) || 0

        // 4. Fetch Next 5 Upcoming Appointments
        const { data: upcoming } = await supabase
          .from('appointments')
          .select('*, services(name), users(email)')
          .eq('tenant_id', tenantId)
          .gte('appointment_time', new Date().toISOString())
          .order('appointment_time', { ascending: true })
          .limit(5)

        setStats({
          todayCount,
          todayRevenue,
          servicesCount: sCount || 0,
        })
        
        setUpcomingAppointments(upcoming || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (tenantSlug) {
      fetchDashboardData()
    }
  }, [tenantSlug])

  const statCards = [
    { 
      name: 'Turnos de Hoy', 
      value: stats.todayCount, 
      icon: Calendar, 
      desc: 'Citas programadas para la fecha',
      colorClass: 'border-emerald-200/50 dark:border-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-700/50',
      iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
    },
    { 
      name: 'Ingresos de Hoy', 
      value: `$${stats.todayRevenue.toLocaleString('es-AR')}`, 
      icon: DollarSign, 
      desc: 'Recaudación estimada del día',
      colorClass: 'border-amber-200/50 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700/50',
      iconBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
    },
    { 
      name: 'Servicios Activos', 
      value: stats.servicesCount, 
      icon: Scissors, 
      desc: 'Opciones en tu catálogo',
      colorClass: 'border-indigo-200/50 dark:border-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700/50',
      iconBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Resumen Diario</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Cómo marcha tu jornada hoy.</p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white dark:bg-card-custom border border-border-custom rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.name}
                className={`bg-white dark:bg-card-custom border ${card.colorClass} rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-450 dark:text-zinc-505 uppercase tracking-wider">{card.name}</span>
                  <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">{card.value}</span>
                  <p className="text-xs text-zinc-400 mt-1 dark:text-zinc-500">{card.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upcoming appointments list */}
      <div className="bg-white dark:bg-card-custom border border-border-custom rounded-2xl shadow-xs p-6">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          Próximos Turnos
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-zinc-50 dark:bg-zinc-900 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border-custom rounded-xl bg-zinc-50/50 dark:bg-primary-light/5">
            <Sparkles className="w-8 h-8 text-primary/30 mx-auto mb-2 animate-bounce-slow" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No hay turnos programados a futuro</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Ve al menú agenda para programar citas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-zinc-50/50 dark:bg-primary-light/10 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Hora Cita</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-sm">
                {upcomingAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-primary-light/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{appt.client_name}</div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">{appt.client_phone || appt.users?.email || '-'}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-305">
                      {new Date(appt.appointment_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-305 font-medium">
                      {appt.services?.name || 'Servicio Desconocido'}
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">
                      ${Number(appt.total_price).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        appt.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : appt.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400'
                          : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                      }`}>
                        {appt.status === 'confirmed' && 'Confirmado'}
                        {appt.status === 'pending' && 'Pendiente'}
                        {appt.status === 'canceled' && 'Cancelado'}
                        {appt.status === 'completed' && 'Completado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
