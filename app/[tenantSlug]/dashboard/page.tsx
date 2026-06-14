'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Calendar, Scissors, Sparkles, DollarSign,
  Clock, TrendingUp, BarChart2
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'

// ─── Animated counter hook ────────────────────────────────────────────────────
function useAnimatedNumber(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(eased * target))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return value
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string
  client_name: string
  client_phone: string
  appointment_time: string
  status: string
  total_price: number
  services?: { name: string } | null
  users?: { email: string } | null
}

interface ChartDay {
  label: string
  revenue: number
  count: number
}

interface PopularService {
  name: string
  count: number
  revenue: number
}

interface StatusCount {
  status: string
  count: number
}

// ─── Argentina timezone helper ────────────────────────────────────────────────

const TZ = 'America/Argentina/Buenos_Aires'
const toLocalDate = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

// ─── Bar Chart — últimos 7 días ───────────────────────────────────────────────

function WeeklyRevenueChart({ data }: { data: ChartDay[] }) {
  const CHART_H = 96
  const max = Math.max(...data.map(d => d.revenue), 1)

  return (
    <div className="flex items-end gap-2" style={{ height: CHART_H + 24 }}>
      {data.map((d, i) => {
        const barH = d.revenue > 0 ? Math.max(Math.round((d.revenue / max) * CHART_H), 6) : 0
        const isToday = i === data.length - 1
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            {/* Bar container */}
            <div
              className="relative w-full rounded-md bg-zinc-100 dark:bg-zinc-800/60"
              style={{ height: CHART_H }}
              title={`${d.label}: $${d.revenue.toLocaleString('es-AR')} · ${d.count} turno${d.count !== 1 ? 's' : ''}`}
            >
              {/* Filled bar */}
              <div
                className={`absolute bottom-0 left-0 right-0 rounded-md transition-all duration-500 ${
                  isToday ? 'bg-primary' : 'bg-primary/60 group-hover:bg-primary/80'
                }`}
                style={{ height: barH }}
              />
              {/* Tooltip on hover */}
              {d.revenue > 0 && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  ${d.revenue.toLocaleString('es-AR')}
                </div>
              )}
            </div>
            {/* Label */}
            <span className={`text-[9px] font-bold capitalize leading-none ${
              isToday ? 'text-primary' : 'text-zinc-400 dark:text-zinc-500'
            }`}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Horizontal bar — servicios populares ────────────────────────────────────

const SERVICE_COLORS = [
  'bg-primary',
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
]
const SERVICE_TEXT = [
  'text-primary',
  'text-indigo-500',
  'text-emerald-500',
  'text-amber-500',
  'text-rose-500',
]

function PopularServicesChart({ data }: { data: PopularService[] }) {
  const max = Math.max(...data.map(d => d.count), 1)

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
        Sin datos en los últimos 30 días.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.map((s, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">{s.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                ${s.revenue.toLocaleString('es-AR')}
              </span>
              <span className={`text-[10px] font-extrabold ${SERVICE_TEXT[i]}`}>
                {s.count} {s.count === 1 ? 'turno' : 'turnos'}
              </span>
            </div>
          </div>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${SERVICE_COLORS[i]} rounded-full transition-all duration-700`}
              style={{ width: `${(s.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Status stacked bar ───────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  confirmed: { label: 'Confirmados', bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  completed: { label: 'Completados', bg: 'bg-indigo-500',  text: 'text-indigo-600 dark:text-indigo-400'  },
  pending:   { label: 'Pendientes',  bg: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400'    },
  canceled:  { label: 'Cancelados',  bg: 'bg-rose-500',    text: 'text-rose-600 dark:text-rose-400'      },
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function TenantDashboard() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string
  const [loading, setLoading] = useState(true)

  // KPIs
  const [todayCount,    setTodayCount]    = useState(0)
  const [todayRevenue,  setTodayRevenue]  = useState(0)
  const [monthCount,    setMonthCount]    = useState(0)
  const [monthRevenue,  setMonthRevenue]  = useState(0)

  // Charts
  const [weeklyData,       setWeeklyData]       = useState<ChartDay[]>([])
  const [popularServices,  setPopularServices]  = useState<PopularService[]>([])
  const [statusBreakdown,  setStatusBreakdown]  = useState<StatusCount[]>([])

  // Table
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])

  // Subscription banner
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    status: string
    expirationDate: string | null
    daysRemaining: number
  } | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const supabase = createClient()

        // 1. Tenant info
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, status, trial_ends_at, current_period_end')
          .eq('slug', tenantSlug)
          .single()

        if (!tenant) return
        const tenantId = tenant.id

        // Subscription days remaining
        const expirationStr = tenant.status === 'trial' ? tenant.trial_ends_at : tenant.current_period_end
        let daysRemaining = 0
        if (expirationStr) {
          const exp = new Date(expirationStr)
          exp.setHours(0, 0, 0, 0)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          daysRemaining = Math.ceil((exp.getTime() - today.getTime()) / 86400000)
        }
        setSubscriptionInfo({ status: tenant.status, expirationDate: expirationStr, daysRemaining })

        // 2. Single query: last 30 days appointments
        const now = new Date()
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(now.getDate() - 29)
        thirtyDaysAgo.setHours(0, 0, 0, 0)

        const { data: raw } = await supabase
          .from('appointments')
          .select('appointment_time, total_price, status, services(name)')
          .eq('tenant_id', tenantId)
          .gte('appointment_time', thirtyDaysAgo.toISOString())
          .order('appointment_time', { ascending: true })

        const appts = (raw || []).map((a: any) => ({
          ...a,
          services: Array.isArray(a.services) ? a.services[0] : a.services,
        }))

        // ── Today
        const todayStr = toLocalDate(now)
        const todayAppts = appts.filter(a => toLocalDate(new Date(a.appointment_time)) === todayStr)
        setTodayCount(todayAppts.length)
        setTodayRevenue(
          todayAppts
            .filter(a => a.status !== 'canceled')
            .reduce((s: number, a: any) => s + Number(a.total_price), 0)
        )

        // ── Current calendar month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthAppts = appts.filter(a => new Date(a.appointment_time) >= startOfMonth)
        setMonthCount(monthAppts.length)
        setMonthRevenue(
          monthAppts
            .filter((a: any) => a.status !== 'canceled')
            .reduce((s: number, a: any) => s + Number(a.total_price), 0)
        )

        // ── Weekly chart (last 7 days)
        const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        const weekly: ChartDay[] = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now)
          d.setDate(now.getDate() - (6 - i))
          const dateStr = toLocalDate(d)
          const dayAppts = appts.filter(
            (a: any) => toLocalDate(new Date(a.appointment_time)) === dateStr && a.status !== 'canceled'
          )
          return {
            label: i === 6 ? 'Hoy' : DAY_NAMES[d.getDay()],
            revenue: dayAppts.reduce((s: number, a: any) => s + Number(a.total_price), 0),
            count: dayAppts.length,
          }
        })
        setWeeklyData(weekly)

        // ── Popular services (last 30 days, non-canceled)
        const svcMap = new Map<string, { count: number; revenue: number }>()
        appts
          .filter((a: any) => a.status !== 'canceled' && a.services?.name)
          .forEach((a: any) => {
            const name = a.services.name
            const prev = svcMap.get(name) || { count: 0, revenue: 0 }
            svcMap.set(name, { count: prev.count + 1, revenue: prev.revenue + Number(a.total_price) })
          })
        setPopularServices(
          Array.from(svcMap.entries())
            .map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        )

        // ── Status breakdown (current month)
        const statusMap = new Map<string, number>()
        monthAppts.forEach((a: any) => {
          statusMap.set(a.status, (statusMap.get(a.status) || 0) + 1)
        })
        setStatusBreakdown([
          { status: 'confirmed', count: statusMap.get('confirmed') || 0 },
          { status: 'completed', count: statusMap.get('completed') || 0 },
          { status: 'pending',   count: statusMap.get('pending')   || 0 },
          { status: 'canceled',  count: statusMap.get('canceled')  || 0 },
        ])

        // 3. Next 5 upcoming (confirmed/pending only)
        const { data: upcoming } = await supabase
          .from('appointments')
          .select('*, services(name), users(email)')
          .eq('tenant_id', tenantId)
          .gte('appointment_time', new Date().toISOString())
          .in('status', ['confirmed', 'pending'])
          .order('appointment_time', { ascending: true })
          .limit(5)

        setUpcomingAppointments(
          (upcoming || []).map((a: any) => ({
            ...a,
            services: Array.isArray(a.services) ? a.services[0] : a.services,
            users:    Array.isArray(a.users)    ? a.users[0]    : a.users,
          }))
        )
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (tenantSlug) fetchDashboardData()
  }, [tenantSlug])

  const totalMonthAppts = statusBreakdown.reduce((s, b) => s + b.count, 0)
  const weekTotal = weeklyData.reduce((s, d) => s + d.revenue, 0)

  // ── KPI cards config
  const kpiCards = [
    {
      name: 'Turnos de Hoy',
      value: todayCount,
      format: false,
      icon: Calendar,
      color: 'emerald',
      desc: 'Citas de la jornada',
    },
    {
      name: 'Ingresos de Hoy',
      value: todayRevenue,
      format: true,
      icon: DollarSign,
      color: 'amber',
      desc: 'Facturado hoy',
    },
    {
      name: 'Turnos del Mes',
      value: monthCount,
      format: false,
      icon: TrendingUp,
      color: 'indigo',
      desc: 'Mes en curso',
    },
    {
      name: 'Ingresos del Mes',
      value: monthRevenue,
      format: true,
      icon: Sparkles,
      color: 'rose',
      desc: 'Recaudación mensual',
    },
  ]

  const colorMap: Record<string, { bar: string; icon: string; glow: string }> = {
    emerald: {
      bar:  'bg-emerald-500',
      icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
      glow: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
      bar:  'bg-amber-500',
      icon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
      glow: 'text-amber-600 dark:text-amber-400',
    },
    indigo: {
      bar:  'bg-indigo-500',
      icon: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
      glow: 'text-indigo-600 dark:text-indigo-400',
    },
    rose: {
      bar:  'bg-rose-500',
      icon: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
      glow: 'text-rose-600 dark:text-rose-400',
    },
  }

  // ── Animated KPI card sub-component
  function AnimatedKpiCard({ card }: { card: typeof kpiCards[number] }) {
    const animated = useAnimatedNumber(card.value)
    const Icon = card.icon
    const c = colorMap[card.color]
    const displayValue = card.format
      ? `$${animated.toLocaleString('es-AR')}`
      : animated
    return (
      <div className="animate-fade-in-up relative bg-white dark:bg-card-custom border border-border-custom rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.bar}`} />
        <div className="pl-5 pr-5 pt-5 pb-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{card.name}</span>
            <div className={`p-2 rounded-xl ${c.icon}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
          <span className={`text-3xl font-extrabold tracking-tight ${c.glow}`}>
            {displayValue}
          </span>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{card.desc}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Subscription banner ── */}
      {subscriptionInfo && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-xs ${
          subscriptionInfo.daysRemaining >= 10
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/50 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/30'
            : subscriptionInfo.daysRemaining >= 5
            ? 'bg-amber-50 text-amber-800 border-amber-200/50 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900/30'
            : 'bg-rose-50 text-rose-800 border-rose-200/50 dark:bg-rose-950/10 dark:text-rose-400 dark:border-rose-900/30'
        }`}>
          <span className={`w-3 h-3 rounded-full shrink-0 ${
            subscriptionInfo.daysRemaining >= 10
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
              : subscriptionInfo.daysRemaining >= 5
              ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse'
              : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-ping'
          }`} />
          <div>
            <p className="font-bold text-sm">
              {subscriptionInfo.daysRemaining >= 10
                ? `Suscripción Activa — ${subscriptionInfo.status === 'trial' ? 'Período de Prueba' : 'Plan Habilitado'}`
                : subscriptionInfo.daysRemaining >= 5
                ? 'Atención: Próximo Vencimiento'
                : '¡Alerta de Vencimiento Crítica!'}
            </p>
            <p className="text-xs opacity-90 mt-0.5">
              {subscriptionInfo.daysRemaining >= 10
                ? `Expira el ${new Date(subscriptionInfo.expirationDate!).toLocaleDateString('es-AR')}. Quedan ${subscriptionInfo.daysRemaining} días.`
                : subscriptionInfo.daysRemaining >= 5
                ? `Vence en ${subscriptionInfo.daysRemaining} días. Renová para continuar sin interrupciones.`
                : `Solo ${subscriptionInfo.daysRemaining} días restantes. Renová hoy para no perder el acceso.`}
            </p>
          </div>
        </div>
      )}

      {/* ── Title ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Panel General</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Rendimiento y actividad de tu negocio.</p>
      </div>

      {/* ── KPI Cards ── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white dark:bg-card-custom border border-border-custom rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          {kpiCards.map(card => (
            <AnimatedKpiCard key={card.name} card={card} />
          ))}
        </div>
      )}

      {/* ── Charts Row ── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Weekly Revenue */}
        <div className="lg:col-span-3 bg-white dark:bg-card-custom border border-border-custom rounded-2xl p-5 shadow-xs">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                Ingresos — Últimos 7 Días
              </h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Facturación diaria (excluye cancelados)</p>
            </div>
            {!loading && (
              <span className="text-xs font-bold text-primary bg-primary/10 dark:bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
                ${weekTotal.toLocaleString('es-AR')} semana
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-28 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl animate-pulse" />
          ) : (
            <WeeklyRevenueChart data={weeklyData} />
          )}
        </div>

        {/* Popular Services */}
        <div className="lg:col-span-2 bg-white dark:bg-card-custom border border-border-custom rounded-2xl p-5 shadow-xs">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" />
              Servicios Más Solicitados
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Últimos 30 días · top 5</p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <PopularServicesChart data={popularServices} />
          )}
        </div>
      </div>

      {/* ── Status Breakdown ── */}
      {!loading && totalMonthAppts > 0 && (
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Distribución de Turnos — Mes Actual
            </h2>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold">
              {totalMonthAppts} {totalMonthAppts === 1 ? 'turno' : 'turnos'} en total
            </span>
          </div>

          {/* Stacked bar */}
          <div className="flex h-3 rounded-full overflow-hidden gap-px mb-4">
            {statusBreakdown
              .filter(b => b.count > 0)
              .map(b => (
                <div
                  key={b.status}
                  className={`${STATUS_META[b.status]?.bg} transition-all`}
                  style={{ width: `${(b.count / totalMonthAppts) * 100}%` }}
                  title={`${STATUS_META[b.status]?.label}: ${b.count}`}
                />
              ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {statusBreakdown.map(b => {
              const meta = STATUS_META[b.status]
              const pct = totalMonthAppts > 0 ? Math.round((b.count / totalMonthAppts) * 100) : 0
              return (
                <div key={b.status} className="flex items-center gap-2 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${meta?.bg}`} />
                  <span className="text-zinc-500 dark:text-zinc-400">{meta?.label}</span>
                  <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{b.count}</span>
                  <span className="text-zinc-400 dark:text-zinc-500">({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Upcoming Appointments ── */}
      <div className="bg-white dark:bg-card-custom border border-border-custom rounded-2xl shadow-xs p-5">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          Próximos Turnos
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-zinc-50 dark:bg-zinc-900 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="border border-dashed border-border-custom rounded-xl bg-zinc-50/30 dark:bg-primary-light/5">
            <EmptyState
              variant="appointments"
              title="No hay turnos próximos"
              description="Cuando lleguen nuevas reservas aparecerán aquí. Podés agregar una cita desde la Agenda."
              compact
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-zinc-50/50 dark:bg-primary-light/10 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Fecha y Hora</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-sm">
                {upcomingAppointments.map(appt => (
                  <tr key={appt.id} className="hover:bg-primary-light/10 dark:hover:bg-primary-light/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{appt.client_name}</div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">
                        {appt.client_phone || appt.users?.email || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300 text-sm">
                      {new Date(appt.appointment_time).toLocaleString('es-AR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 font-medium">
                      {appt.services?.name || '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">
                      ${Number(appt.total_price).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        appt.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40'
                          : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40'
                      }`}>
                        {appt.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
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
