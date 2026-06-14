'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import EmptyState from '@/components/EmptyState'
import { FileDown, Printer, Calendar, TrendingUp, Users, ChevronDown } from 'lucide-react'

const TZ = 'America/Argentina/Buenos_Aires'
function toLocalDate(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(iso))
}

// ─── CSV export helper ────────────────────────────────────────────────────────
function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r =>
    r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Appointment {
  id: string
  appointment_time: string
  client_name: string
  client_phone: string
  status: string
  total_price: number
  service_name: string
  staff_name:   string
}

interface DaySummary {
  date:     string
  count:    number
  revenue:  number
  canceled: number
}

interface ClientRow {
  id: string
  name: string
  phone: string
  visits: number
  total:  number
  last:   string
}

type TabKey = 'turnos' | 'ingresos' | 'clientes'

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmado',
  completed: 'Completado',
  pending:   'Pendiente',
  canceled:  'Cancelado',
}

export default function ReportesPage() {
  const params     = useParams()
  const tenantSlug = params.tenantSlug as string
  const supabase   = createClient()
  const printRef   = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab]     = useState<TabKey>('turnos')
  const [loading, setLoading]         = useState(false)
  const [tenantId, setTenantId]       = useState<string | null>(null)
  const [tenantName, setTenantName]   = useState('')

  // Date range
  const now   = new Date()
  const [from, setFrom] = useState(toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to,   setTo]   = useState(toLocalDate(now))

  // Data
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [daySummary,   setDaySummary]   = useState<DaySummary[]>([])
  const [clients,      setClients]      = useState<ClientRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (!tenantId) {
        const { data: t } = await supabase.from('tenants').select('id, name').eq('slug', tenantSlug).single()
        if (!t) return
        setTenantId(t.id)
        setTenantName(t.name)
        return
      }

      const { data: raw } = await supabase
        .from('appointments')
        .select(`
          id, appointment_time, client_name, client_phone, status, total_price,
          services ( name ),
          users    ( first_name, last_name )
        `)
        .eq('tenant_id', tenantId)
        .gte('appointment_time', from + 'T00:00:00')
        .lte('appointment_time', to   + 'T23:59:59')
        .order('appointment_time', { ascending: false })

      const appts: Appointment[] = (raw || []).map((a: any) => ({
        id:               a.id,
        appointment_time: a.appointment_time,
        client_name:      a.client_name || '—',
        client_phone:     a.client_phone || '—',
        status:           a.status,
        total_price:      Number(a.total_price || 0),
        service_name:     (Array.isArray(a.services) ? a.services[0] : a.services)?.name || '—',
        staff_name:       (() => {
          const u = Array.isArray(a.users) ? a.users[0] : a.users
          return u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : '—'
        })(),
      }))
      setAppointments(appts)

      // Day summary
      const dayMap = new Map<string, DaySummary>()
      for (const a of appts) {
        const d = toLocalDate(new Date(a.appointment_time))
        const prev = dayMap.get(d) || { date: d, count: 0, revenue: 0, canceled: 0 }
        dayMap.set(d, {
          date:     d,
          count:    prev.count + 1,
          revenue:  prev.revenue + (a.status !== 'canceled' ? a.total_price : 0),
          canceled: prev.canceled + (a.status === 'canceled' ? 1 : 0),
        })
      }
      setDaySummary(
        Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date))
      )

      // Clients summary
      const cliMap = new Map<string, ClientRow>()
      for (const a of appts) {
        if (a.status === 'canceled') continue
        const key = a.client_phone !== '—' ? a.client_phone : a.client_name
        const prev = cliMap.get(key) || { id: key, name: a.client_name, phone: a.client_phone, visits: 0, total: 0, last: a.appointment_time }
        cliMap.set(key, {
          ...prev,
          visits: prev.visits + 1,
          total:  prev.total + a.total_price,
          last:   a.appointment_time > prev.last ? a.appointment_time : prev.last,
        })
      }
      setClients(
        Array.from(cliMap.values()).sort((a, b) => b.visits - a.visits)
      )
    } finally {
      setLoading(false)
    }
  }, [tenantId, from, to])

  // Load tenant on mount
  useEffect(() => {
    const init = async () => {
      const { data: t } = await supabase.from('tenants').select('id, name').eq('slug', tenantSlug).single()
      if (t) { setTenantId(t.id); setTenantName(t.name) }
    }
    init()
  }, [tenantSlug])

  useEffect(() => {
    if (tenantId) load()
  }, [tenantId, from, to])

  // ─── Export handlers ───────────────────────────────────────────────────────
  const exportTurnos = () => {
    const header = ['Fecha/Hora', 'Cliente', 'Teléfono', 'Servicio', 'Profesional', 'Estado', 'Precio']
    const rows   = appointments.map(a => [
      fmtDateTime(a.appointment_time),
      a.client_name, a.client_phone, a.service_name, a.staff_name,
      STATUS_LABELS[a.status] || a.status,
      a.total_price,
    ])
    downloadCSV([header, ...rows], `turnos_${from}_${to}.csv`)
  }

  const exportIngresos = () => {
    const header = ['Fecha', 'Turnos', 'Cancelados', 'Ingresos']
    const rows   = daySummary.map(d => [d.date, d.count, d.canceled, d.revenue])
    downloadCSV([header, ...rows], `ingresos_${from}_${to}.csv`)
  }

  const exportClientes = () => {
    const header = ['Cliente', 'Teléfono', 'Visitas', 'Total gastado', 'Última visita']
    const rows   = clients.map(c => [c.name, c.phone, c.visits, c.total, fmtDateTime(c.last)])
    downloadCSV([header, ...rows], `clientes_${from}_${to}.csv`)
  }

  const handleExport = () => {
    if (activeTab === 'turnos')   exportTurnos()
    if (activeTab === 'ingresos') exportIngresos()
    if (activeTab === 'clientes') exportClientes()
  }

  const handlePrint = () => {
    window.print()
  }

  // ─── Totals ────────────────────────────────────────────────────────────────
  const totalRevenue  = daySummary.reduce((s, d) => s + d.revenue, 0)
  const totalTurnos   = appointments.length
  const totalClientes = clients.length

  const tabs: { key: TabKey; label: string; icon: typeof Calendar }[] = [
    { key: 'turnos',   label: `Turnos (${totalTurnos})`,     icon: Calendar   },
    { key: 'ingresos', label: `Ingresos`,                    icon: TrendingUp },
    { key: 'clientes', label: `Clientes (${totalClientes})`, icon: Users      },
  ]

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-area { display: block !important; }
          #print-area * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <FileDown className="w-6 h-6 text-primary" />
              Reportes y Exportación
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Descargá reportes en CSV o imprimí en PDF.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2.5 border border-border-custom text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-card-custom border border-border-custom rounded-xl px-4 py-3">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Período:</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Desde</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={e => setFrom(e.target.value)}
              className="text-sm border border-border-custom rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Hasta</label>
            <input
              type="date"
              value={to}
              min={from}
              max={toLocalDate(now)}
              onChange={e => setTo(e.target.value)}
              className="text-sm border border-border-custom rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {/* Quick picks */}
          {[
            { label: 'Este mes',  from: toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),     to: toLocalDate(now) },
            { label: 'Mes ant.',  from: toLocalDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: toLocalDate(new Date(now.getFullYear(), now.getMonth(), 0)) },
            { label: '7 días',   from: toLocalDate(new Date(now.getTime() - 6*86400000)),                to: toLocalDate(now) },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => { setFrom(p.from); setTo(p.to) }}
              className="px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary KPIs */}
        {!loading && (
          <div className="grid grid-cols-3 gap-4">
            <div className="relative bg-white dark:bg-card-custom border border-border-custom rounded-2xl overflow-hidden shadow-xs">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
              <div className="pl-5 py-4 pr-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Turnos</p>
                <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{totalTurnos}</p>
              </div>
            </div>
            <div className="relative bg-white dark:bg-card-custom border border-border-custom rounded-2xl overflow-hidden shadow-xs">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
              <div className="pl-5 py-4 pr-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Ingresos</p>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  ${totalRevenue.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            <div className="relative bg-white dark:bg-card-custom border border-border-custom rounded-2xl overflow-hidden shadow-xs">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
              <div className="pl-5 py-4 pr-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Clientes únicos</p>
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{totalClientes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div>
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl w-fit mb-5">
            {tabs.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === t.key
                      ? 'bg-white dark:bg-card-custom text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Print area */}
          <div id="print-area" ref={printRef}>
            <div className="print:mb-4 hidden print:block text-xl font-bold">{tenantName} — Reporte {activeTab} ({from} a {to})</div>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}
              </div>
            ) : activeTab === 'turnos' ? (
              appointments.length === 0 ? (
                <EmptyState variant="appointments" title="Sin turnos en este período" description="Probá con un rango de fechas diferente." />
              ) : (
                <div className="bg-white dark:bg-card-custom border border-border-custom rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-border-custom">
                        <tr className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Fecha/Hora</th>
                          <th className="px-4 py-3 text-left">Cliente</th>
                          <th className="px-4 py-3 text-left">Servicio</th>
                          <th className="px-4 py-3 text-left">Profesional</th>
                          <th className="px-4 py-3 text-center">Estado</th>
                          <th className="px-4 py-3 text-right">Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-custom">
                        {appointments.map(a => (
                          <tr key={a.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                            <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDateTime(a.appointment_time)}</td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{a.client_name}</p>
                              <p className="text-xs text-zinc-400">{a.client_phone !== '—' ? a.client_phone : ''}</p>
                            </td>
                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{a.service_name}</td>
                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{a.staff_name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : a.status === 'completed' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                : a.status === 'canceled'  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                                {STATUS_LABELS[a.status] || a.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                              ${a.total_price.toLocaleString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : activeTab === 'ingresos' ? (
              daySummary.length === 0 ? (
                <EmptyState variant="sales" title="Sin ingresos en este período" description="Ajustá el rango de fechas." />
              ) : (
                <div className="bg-white dark:bg-card-custom border border-border-custom rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-border-custom">
                      <tr className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-right">Turnos</th>
                        <th className="px-4 py-3 text-right">Cancelados</th>
                        <th className="px-4 py-3 text-right">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {daySummary.map(d => (
                        <tr key={d.date} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{d.date}</td>
                          <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{d.count}</td>
                          <td className="px-4 py-3 text-right">
                            {d.canceled > 0
                              ? <span className="text-rose-500 font-semibold">{d.canceled}</span>
                              : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            ${d.revenue.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-zinc-50/80 dark:bg-zinc-900/40 font-bold border-t-2 border-border-custom">
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">Total</td>
                        <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">{totalTurnos}</td>
                        <td className="px-4 py-3 text-right text-rose-500">{daySummary.reduce((s,d)=>s+d.canceled,0)||'—'}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 text-base">
                          ${totalRevenue.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              clients.length === 0 ? (
                <EmptyState variant="clients" title="Sin clientes en este período" description="Ajustá el rango de fechas." />
              ) : (
                <div className="bg-white dark:bg-card-custom border border-border-custom rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-border-custom">
                      <tr className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Cliente</th>
                        <th className="px-4 py-3 text-left">Teléfono</th>
                        <th className="px-4 py-3 text-right">Visitas</th>
                        <th className="px-4 py-3 text-right">Total gastado</th>
                        <th className="px-4 py-3 text-right">Última visita</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {clients.map(c => (
                        <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-primary">{c.name[0]?.toUpperCase()}</span>
                              </div>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs">{c.phone !== '—' ? c.phone : '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{c.visits}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            ${c.total.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-zinc-500 dark:text-zinc-400">
                            {fmtDateTime(c.last)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  )
}
