'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  Settings, Save, Loader2, Store, Phone,
  FileText, Calendar, CheckCircle, AlertCircle,
  Clock, CalendarOff, Plus, X
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DaySchedule {
  day: number    // JS getDay(): 0=Sunday … 6=Saturday
  label: string
  open: boolean
  start: string  // "HH:MM"
  end: string    // "HH:MM"
}

interface BlockedDate {
  date: string   // "YYYY-MM-DD"
  reason: string
}

const DEFAULT_HOURS: DaySchedule[] = [
  { day: 1, label: 'Lunes',      open: true,  start: '09:00', end: '18:00' },
  { day: 2, label: 'Martes',     open: true,  start: '09:00', end: '18:00' },
  { day: 3, label: 'Miércoles',  open: true,  start: '09:00', end: '18:00' },
  { day: 4, label: 'Jueves',     open: true,  start: '09:00', end: '18:00' },
  { day: 5, label: 'Viernes',    open: true,  start: '09:00', end: '18:00' },
  { day: 6, label: 'Sábado',     open: true,  start: '09:00', end: '14:00' },
  { day: 0, label: 'Domingo',    open: false, start: '09:00', end: '14:00' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfigurationPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)

  // Business info
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [cuit, setCuit] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [activityStartDate, setActivityStartDate] = useState('')

  // Business hours (one entry per day, ordered Mon→Sun)
  const [businessHours, setBusinessHours] = useState<DaySchedule[]>(DEFAULT_HOURS)

  // Blocked dates (holidays / rest days)
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [newDate, setNewDate] = useState('')
  const [newReason, setNewReason] = useState('')

  // Notifications
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchTenantData = async () => {
      setLoading(true)
      setErrorMsg('')
      try {
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select('id, name, address, cuit, phone, email, activity_start_date, business_hours, blocked_dates')
          .eq('slug', tenantSlug)
          .single()

        if (error) {
          if (
            error.message.includes('address') ||
            error.message.includes('business_hours') ||
            error.message.includes('does not exist')
          ) {
            const { data: basic, error: basicErr } = await supabase
              .from('tenants')
              .select('id, name')
              .eq('slug', tenantSlug)
              .single()
            if (basicErr) throw basicErr
            if (basic) {
              setTenantId(basic.id)
              setName(basic.name || '')
              setErrorMsg('Falta ejecutar la migración SQL. Copiá y ejecutá "business_hours_migration.sql" en el SQL Editor de Supabase.')
            }
          } else {
            throw error
          }
        } else if (tenant) {
          setTenantId(tenant.id)
          setName(tenant.name || '')
          setAddress((tenant as any).address || '')
          setCuit((tenant as any).cuit || '')
          setPhone((tenant as any).phone || '')
          setEmail((tenant as any).email || '')
          setActivityStartDate((tenant as any).activity_start_date || '')

          const savedHours = (tenant as any).business_hours
          setBusinessHours(
            Array.isArray(savedHours) && savedHours.length === 7 ? savedHours : DEFAULT_HOURS
          )

          const savedBlocked = (tenant as any).blocked_dates
          setBlockedDates(Array.isArray(savedBlocked) ? savedBlocked : [])
        }
      } catch (err: any) {
        console.error('Error fetching tenant data:', err.message)
        setErrorMsg('Error al cargar la configuración del comercio.')
      } finally {
        setLoading(false)
      }
    }

    if (tenantSlug) fetchTenantData()
  }, [tenantSlug])

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId) return
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: name.trim(),
          address: address.trim() || null,
          cuit: cuit.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          activity_start_date: activityStartDate.trim() || null,
          business_hours: businessHours,
          blocked_dates: blockedDates,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)

      if (error) {
        if (error.message.includes('business_hours') || error.message.includes('does not exist')) {
          throw new Error('Ejecutá "business_hours_migration.sql" en Supabase para habilitar horarios y días bloqueados.')
        }
        throw error
      }

      setSuccessMsg('Configuración guardada correctamente.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      console.error('Error updating tenant:', err.message)
      setErrorMsg(err.message || 'Error al guardar los datos.')
    } finally {
      setSaving(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const toggleDay = (idx: number) => {
    setBusinessHours(prev => prev.map((d, i) => i === idx ? { ...d, open: !d.open } : d))
  }

  const updateHour = (idx: number, field: 'start' | 'end', value: string) => {
    setBusinessHours(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  const addBlockedDate = () => {
    if (!newDate) return
    if (blockedDates.some(b => b.date === newDate)) return
    setBlockedDates(prev =>
      [...prev, { date: newDate, reason: newReason.trim() }]
        .sort((a, b) => a.date.localeCompare(b.date))
    )
    setNewDate('')
    setNewReason('')
  }

  const removeBlockedDate = (date: string) => {
    setBlockedDates(prev => prev.filter(b => b.date !== date))
  }

  // ── Loading screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Cargando configuración del comercio...</span>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Configuración del Comercio
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Administrá los datos comerciales, horarios de atención y días no laborables.
        </p>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-500/30 text-rose-800 dark:text-rose-300 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Card: Datos del Comercio ─────────────────────────── */}
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border-custom pb-4">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Store className="w-4 h-4 text-zinc-500" />
              Datos de Identificación y Facturación
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Ingresá los datos fiscales y de marca que aparecerán en los tickets de cobro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre Comercial"
              type="text"
              required
              placeholder="Ej: Bella Estética & Spa"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="CUIT (Identificación Tributaria)"
              type="text"
              placeholder="Ej: 20-35678901-9"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
            />
            <Input
              label="Fecha Inicio de Actividades"
              type="text"
              placeholder="Ej: 01/10/2024 o Octubre 2024"
              value={activityStartDate}
              onChange={(e) => setActivityStartDate(e.target.value)}
            />
            <Input
              label="Dirección Física"
              type="text"
              placeholder="Ej: Av. San Martín 1234, Santa Rosa"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="border-b border-border-custom pt-2 pb-4">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4 text-zinc-500" />
              Datos de Contacto
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Se mostrará como vía de consulta en el ticket.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Teléfono / Celular"
              type="text"
              placeholder="Ej: +54 2954 123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="Ej: contacto@bellaestetica.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-550 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-bold block mb-0.5">Nota Legal:</span>
              Todos los recibos impresos llevarán la leyenda <strong>&quot;NO VÁLIDO COMO FACTURA&quot;</strong>.
            </div>
          </div>
        </div>

        {/* ── Card: Horarios de Atención ───────────────────────── */}
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm space-y-4">
          <div className="border-b border-border-custom pb-4">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              Horarios de Atención
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Definí los días y horarios habilitados. Se aplican automáticamente en el portal de reservas online.
            </p>
          </div>

          {/* Column header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_80px_100px_16px_100px] gap-3 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <span>Día</span>
            <span className="text-center">Abierto</span>
            <span className="text-center">Desde</span>
            <span />
            <span className="text-center">Hasta</span>
          </div>

          <div className="space-y-2">
            {businessHours.map((day, idx) => (
              <div
                key={day.day}
                className={`flex flex-col sm:grid sm:grid-cols-[1fr_80px_100px_16px_100px] items-start sm:items-center gap-2 sm:gap-3 px-3 py-3 rounded-xl border transition-all ${
                  day.open
                    ? 'bg-zinc-50 dark:bg-zinc-900/40 border-border-custom/60'
                    : 'bg-white dark:bg-card-custom border-border-custom/30 opacity-60'
                }`}
              >
                {/* Day label */}
                <span className={`text-sm font-semibold ${day.open ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {day.label}
                  {!day.open && <span className="ml-2 text-[10px] font-normal text-zinc-400">Cerrado</span>}
                </span>

                {/* Toggle */}
                <div className="flex sm:justify-center">
                  <button
                    type="button"
                    onClick={() => toggleDay(idx)}
                    aria-label={day.open ? 'Deshabilitar día' : 'Habilitar día'}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      day.open ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-600'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${day.open ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Start time */}
                <div className="w-full sm:w-auto space-y-0.5">
                  <label className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-zinc-400">Desde</label>
                  <input
                    type="time"
                    disabled={!day.open}
                    value={day.start}
                    onChange={(e) => updateHour(idx, 'start', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-border-custom rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                <span className="hidden sm:flex text-zinc-300 dark:text-zinc-600 text-xs justify-center">→</span>

                {/* End time */}
                <div className="w-full sm:w-auto space-y-0.5">
                  <label className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-zinc-400">Hasta</label>
                  <input
                    type="time"
                    disabled={!day.open}
                    value={day.end}
                    onChange={(e) => updateHour(idx, 'end', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-border-custom rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 pt-1">
            Los horarios se muestran en zona horaria de Argentina (UTC-3). Los clientes solo podrán reservar dentro de estos rangos.
          </p>
        </div>

        {/* ── Card: Días Bloqueados ────────────────────────────── */}
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm space-y-4">
          <div className="border-b border-border-custom pb-4">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-zinc-500" />
              Días de Descanso y Feriados
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Bloqueá fechas específicas (feriados, vacaciones, eventos) en que el negocio no atiende.
            </p>
          </div>

          {/* Add row */}
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="w-full sm:w-40 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Fecha</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-border-custom rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Motivo (opcional)</label>
              <input
                type="text"
                placeholder="Ej: Feriado nacional, Vacaciones..."
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlockedDate())}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-border-custom rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="button"
              onClick={addBlockedDate}
              disabled={!newDate}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>

          {/* List */}
          {blockedDates.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 text-xs border border-dashed border-border-custom rounded-xl">
              Sin días bloqueados. Agregá feriados o fechas de descanso para que no aparezcan disponibles en el portal de reservas.
            </div>
          ) : (
            <div className="space-y-2">
              {blockedDates.map((item) => {
                const label = new Date(item.date + 'T12:00:00').toLocaleDateString('es-AR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })
                return (
                  <div
                    key={item.date}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/30 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 capitalize">{label}</p>
                        {item.reason && (
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{item.reason}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlockedDate(item.date)}
                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Save ─────────────────────────────────────────────── */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            className="flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Guardando...</span></>
            ) : (
              <><Save className="w-4 h-4" /><span>Guardar Configuración</span></>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
