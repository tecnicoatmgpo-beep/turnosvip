'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import EmptyState from '@/components/EmptyState'
import { Percent, Save, ChevronDown, TrendingUp, Users, DollarSign, Award } from 'lucide-react'

const TZ = 'America/Argentina/Buenos_Aires'

function toLocalDate(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

interface StaffRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  specialty: string | null
  commission_pct: number
  appointments: number
  revenue: number
  dirty: boolean
}

type PeriodKey = 'current_month' | 'last_month' | 'last_7' | 'last_30'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'current_month', label: 'Mes actual'    },
  { key: 'last_month',    label: 'Mes anterior'  },
  { key: 'last_7',        label: 'Últimos 7 días'},
  { key: 'last_30',       label: 'Últimos 30 días'},
]

function getRange(period: PeriodKey): { from: string; to: string } {
  const now = new Date()
  if (period === 'current_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: toLocalDate(from), to: toLocalDate(to) }
  }
  if (period === 'last_month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to   = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: toLocalDate(from), to: toLocalDate(to) }
  }
  if (period === 'last_7') {
    const from = new Date(now); from.setDate(now.getDate() - 6)
    return { from: toLocalDate(from), to: toLocalDate(now) }
  }
  const from = new Date(now); from.setDate(now.getDate() - 29)
  return { from: toLocalDate(from), to: toLocalDate(now) }
}

export default function ComisionesPage() {
  const params     = useParams()
  const tenantSlug = params.tenantSlug as string
  const supabase   = createClient()

  const [rows,     setRows]     = useState<StaffRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [period,   setPeriod]   = useState<PeriodKey>('current_month')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Get tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single()
      if (!tenant) return
      setTenantId(tenant.id)

      // 2. Staff list with commission_pct
      const { data: staffData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, specialty, commission_pct')
        .eq('tenant_id', tenant.id)
        .in('role', ['tenant_admin', 'staff'])
        .order('first_name')

      // 3. Appointments in range for revenue per staff
      const { from, to } = getRange(period)
      const { data: appts } = await supabase
        .from('appointments')
        .select('staff_id, total_price')
        .eq('tenant_id', tenant.id)
        .gte('appointment_time', from + 'T00:00:00')
        .lte('appointment_time', to   + 'T23:59:59')
        .not('status', 'eq', 'canceled')

      // 4. Aggregate revenue per staff
      const revenueMap = new Map<string, { count: number; revenue: number }>()
      for (const a of (appts || [])) {
        if (!a.staff_id) continue
        const prev = revenueMap.get(a.staff_id) || { count: 0, revenue: 0 }
        revenueMap.set(a.staff_id, {
          count:   prev.count + 1,
          revenue: prev.revenue + Number(a.total_price || 0),
        })
      }

      setRows(
        (staffData || []).map(s => ({
          id:             s.id,
          first_name:     s.first_name,
          last_name:      s.last_name,
          email:          s.email,
          specialty:      s.specialty,
          commission_pct: Number(s.commission_pct ?? 0),
          appointments:   revenueMap.get(s.id)?.count   ?? 0,
          revenue:        revenueMap.get(s.id)?.revenue ?? 0,
          dirty:          false,
        }))
      )
    } finally {
      setLoading(false)
    }
  }, [tenantSlug, period])

  useEffect(() => { load() }, [load])

  const handlePctChange = (id: string, val: string) => {
    const n = Math.min(100, Math.max(0, Number(val) || 0))
    setRows(prev => prev.map(r => r.id === id ? { ...r, commission_pct: n, dirty: true } : r))
  }

  const handleSave = async (row: StaffRow) => {
    setSaving(row.id)
    await supabase
      .from('users')
      .update({ commission_pct: row.commission_pct })
      .eq('id', row.id)
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, dirty: false } : r))
    setSaving(null)
  }

  const totalRevenue    = rows.reduce((s, r) => s + r.revenue, 0)
  const totalComision   = rows.reduce((s, r) => s + (r.revenue * r.commission_pct / 100), 0)
  const totalAppts      = rows.reduce((s, r) => s + r.appointments, 0)
  const periodLabel     = PERIODS.find(p => p.key === period)?.label ?? ''

  const dirtyCount = rows.filter(r => r.dirty).length

  const handleSaveAll = async () => {
    setSaving('all')
    for (const row of rows.filter(r => r.dirty)) {
      await supabase.from('users').update({ commission_pct: row.commission_pct }).eq('id', row.id)
    }
    setRows(prev => prev.map(r => ({ ...r, dirty: false })))
    setSaving(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Percent className="w-6 h-6 text-primary" />
            Comisiones del Personal
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Ingresos generados y comisiones por profesional.
          </p>
        </div>

        {/* Period selector */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-card-custom border border-border-custom rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {periodLabel}
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-card-custom border border-border-custom rounded-xl shadow-lg overflow-hidden min-w-[160px]">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => { setPeriod(p.key); setShowDropdown(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    period === p.key
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI summary */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {[
            { label: 'Profesionales', value: rows.length,          icon: Users,      color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30', bar: 'bg-indigo-500', fmt: false },
            { label: 'Turnos totales',value: totalAppts,           icon: Award,      color: 'text-emerald-600 dark:text-emerald-400',bg: 'bg-emerald-50 dark:bg-emerald-950/30',bar: 'bg-emerald-500',fmt: false },
            { label: 'Ingresos netos', value: totalRevenue,        icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/30',  bar: 'bg-amber-500',  fmt: true  },
            { label: 'Total comisiones',value: totalComision,      icon: DollarSign, color: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-50 dark:bg-rose-950/30',    bar: 'bg-rose-500',   fmt: true  },
          ].map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} className="animate-fade-in-up relative bg-white dark:bg-card-custom border border-border-custom rounded-2xl overflow-hidden shadow-xs">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${k.bar}`} />
                <div className="pl-5 pr-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{k.label}</span>
                    <div className={`p-1.5 rounded-lg ${k.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${k.color}`} />
                    </div>
                  </div>
                  <span className={`text-2xl font-extrabold tracking-tight ${k.color}`}>
                    {k.fmt ? `$${k.value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : k.value}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Save all banner */}
      {dirtyCount > 0 && (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
            {dirtyCount} porcentaje{dirtyCount !== 1 ? 's' : ''} modificado{dirtyCount !== 1 ? 's' : ''} sin guardar
          </span>
          <button
            onClick={handleSaveAll}
            disabled={saving === 'all'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar todo
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-card-custom border border-border-custom rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border-custom">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Detalle por profesional — {periodLabel}
          </h2>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-zinc-50 dark:bg-zinc-800 rounded-xl animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState variant="clients" title="Sin personal registrado" description="Agregá profesionales desde la sección Personal." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-border-custom">
                <tr className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Profesional</th>
                  <th className="px-5 py-3 text-right">Turnos</th>
                  <th className="px-5 py-3 text-right">Ingresos</th>
                  <th className="px-5 py-3 text-center">% Comisión</th>
                  <th className="px-5 py-3 text-right">Monto Comisión</th>
                  <th className="px-5 py-3 text-center">Guardar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {rows.map(row => {
                  const commission = row.revenue * row.commission_pct / 100
                  const fullName   = [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email
                  return (
                    <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {(row.first_name?.[0] ?? row.email[0]).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{fullName}</p>
                            {row.specialty && (
                              <p className="text-xs text-zinc-400 dark:text-zinc-500">{row.specialty}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{row.appointments}</span>
                        <span className="text-xs text-zinc-400 ml-1">turno{row.appointments !== 1 ? 's' : ''}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          ${row.revenue.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={row.commission_pct}
                            onChange={e => handlePctChange(row.id, e.target.value)}
                            className={`w-16 text-center text-sm font-bold rounded-lg border px-2 py-1.5 bg-white dark:bg-zinc-800 transition-colors outline-none focus:ring-2 focus:ring-primary/30 ${
                              row.dirty
                                ? 'border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-300'
                                : 'border-border-custom text-zinc-900 dark:text-zinc-100'
                            }`}
                          />
                          <span className="text-xs text-zinc-400">%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {row.revenue > 0 ? (
                          <span className={`font-extrabold text-base ${
                            commission > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
                          }`}>
                            ${commission.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {row.dirty && (
                          <button
                            onClick={() => handleSave(row)}
                            disabled={saving === row.id}
                            className="flex items-center gap-1 mx-auto px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
                          >
                            <Save className="w-3 h-3" />
                            {saving === row.id ? '…' : 'Guardar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {/* Totals row */}
                <tr className="bg-zinc-50/80 dark:bg-zinc-900/40 font-bold text-sm border-t-2 border-border-custom">
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">Totales</td>
                  <td className="px-5 py-3 text-right text-zinc-900 dark:text-zinc-100">{totalAppts}</td>
                  <td className="px-5 py-3 text-right text-zinc-900 dark:text-zinc-100">
                    ${totalRevenue.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400 text-base">
                    ${totalComision.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-5 py-3" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
