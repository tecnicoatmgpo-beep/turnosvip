'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Bell, MessageCircle, Check, X, Clock, RefreshCw,
  PhoneOff, Calendar, ChevronDown, ChevronUp
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'

interface Reminder {
  id: string
  appointment_id: string
  reminder_type: '24h' | '2h'
  client_name: string
  client_phone: string
  service_name: string
  appointment_time: string
  message_text: string
  wa_url: string | null
  status: 'pending' | 'sent' | 'skipped'
  sent_at: string | null
  created_at: string
}

type TabKey = 'pending' | 'sent' | 'skipped'

const TZ = 'America/Argentina/Buenos_Aires'

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ, weekday: 'short', day: 'numeric',
    month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(iso))
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(iso))
}

function ReminderCard({
  reminder,
  onSent,
  onSkip
}: {
  reminder: Reminder
  onSent: (id: string) => void
  onSkip: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isPending = reminder.status === 'pending'

  const typeLabel = reminder.reminder_type === '24h' ? '24 horas antes' : '2 horas antes'
  const typeBg    = reminder.reminder_type === '24h'
    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-all ${
      isPending
        ? 'bg-white dark:bg-card-custom border-border-custom'
        : 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-75'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              {reminder.client_name}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBg}`}>
              {typeLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{fmtDateTime(reminder.appointment_time)}</span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {reminder.service_name}
          </div>
          {reminder.client_phone ? (
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              {reminder.client_phone}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-rose-400 mt-0.5">
              <PhoneOff className="w-3 h-3" />
              <span>Sin teléfono registrado</span>
            </div>
          )}
        </div>

        {/* Status badge for non-pending */}
        {!isPending && (
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
            reminder.status === 'sent'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
          }`}>
            {reminder.status === 'sent' ? 'Enviado' : 'Omitido'}
          </span>
        )}
      </div>

      {/* Preview message toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Ocultar mensaje' : 'Ver mensaje'}
      </button>

      {expanded && (
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-line border border-zinc-200 dark:border-zinc-700">
          {reminder.message_text}
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex items-center gap-2 pt-1">
          {reminder.wa_url ? (
            <a
              href={reminder.wa_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onSent(reminder.id)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar por WhatsApp
            </a>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400 italic">
              <PhoneOff className="w-3.5 h-3.5" />
              No se puede enviar — sin teléfono
            </span>
          )}
          <button
            onClick={() => onSkip(reminder.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <X className="w-3.5 h-3.5" />
            Omitir
          </button>
          {reminder.wa_url && (
            <button
              onClick={() => onSent(reminder.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <Check className="w-3.5 h-3.5" />
              Ya enviado
            </button>
          )}
        </div>
      )}

      {!isPending && reminder.sent_at && (
        <div className="text-[10px] text-zinc-400">
          {reminder.status === 'sent' ? 'Enviado' : 'Omitido'} el {fmtDateTime(reminder.sent_at)}
        </div>
      )}
    </div>
  )
}

export default function RecordatoriosPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [reminders, setReminders]     = useState<Reminder[]>([])
  const [loading, setLoading]         = useState(true)
  const [scanning, setScanning]       = useState(false)
  const [tenantId, setTenantId]       = useState<string | null>(null)
  const [activeTab, setActiveTab]     = useState<TabKey>('pending')
  const [lastScan, setLastScan]       = useState<string | null>(null)

  const supabase = createClient()

  const loadTenant = useCallback(async () => {
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()
    if (data) setTenantId(data.id)
    return data?.id ?? null
  }, [tenantSlug])

  const loadReminders = useCallback(async (tid: string) => {
    const { data, error } = await supabase
      .from('appointment_reminders')
      .select('*')
      .eq('tenant_id', tid)
      .order('appointment_time', { ascending: true })
    if (!error && data) setReminders(data as Reminder[])
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const tid = await loadTenant()
      if (tid) await loadReminders(tid)
      setLoading(false)
    }
    init()
  }, [loadTenant, loadReminders])

  const handleMarkSent = async (id: string) => {
    await supabase
      .from('appointment_reminders')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)
    setReminders(prev =>
      prev.map(r => r.id === id ? { ...r, status: 'sent', sent_at: new Date().toISOString() } : r)
    )
  }

  const handleSkip = async (id: string) => {
    await supabase
      .from('appointment_reminders')
      .update({ status: 'skipped', sent_at: new Date().toISOString() })
      .eq('id', id)
    setReminders(prev =>
      prev.map(r => r.id === id ? { ...r, status: 'skipped', sent_at: new Date().toISOString() } : r)
    )
  }

  const handleScan = async () => {
    setScanning(true)
    try {
      const res = await fetch('/api/cron/send-reminders')
      const json = await res.json()
      setLastScan(`${json.created ?? 0} nuevo${json.created !== 1 ? 's' : ''} recordatorio${json.created !== 1 ? 's' : ''} detectado${json.created !== 1 ? 's' : ''}`)
      if (tenantId) await loadReminders(tenantId)
    } catch {
      setLastScan('Error al escanear')
    } finally {
      setScanning(false)
    }
  }

  const pending = reminders.filter(r => r.status === 'pending')
  const sent    = reminders.filter(r => r.status === 'sent')
  const skipped = reminders.filter(r => r.status === 'skipped')

  const tabData: Record<TabKey, { label: string; items: Reminder[]; emptyMsg: string }> = {
    pending: { label: `Pendientes (${pending.length})`,  items: pending, emptyMsg: 'No hay recordatorios pendientes de enviar.' },
    sent:    { label: `Enviados (${sent.length})`,       items: sent,    emptyMsg: 'Aún no se enviaron recordatorios.' },
    skipped: { label: `Omitidos (${skipped.length})`,   items: skipped, emptyMsg: 'No hay recordatorios omitidos.' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Recordatorios WhatsApp
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Recordatorios automáticos de turnos para enviar por WhatsApp.
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Buscando…' : 'Buscar ahora'}
        </button>
      </div>

      {lastScan && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl">
          {lastScan}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-sm text-indigo-700 dark:text-indigo-300 space-y-1">
        <p className="font-semibold">¿Cómo funciona?</p>
        <p>El sistema detecta automáticamente los turnos de las próximas <strong>24h</strong> y <strong>2h</strong> y los lista aquí. Hacé clic en <strong>Enviar por WhatsApp</strong> para abrir la conversación con el mensaje ya escrito.</p>
        <p className="text-xs text-indigo-500 dark:text-indigo-400">El cron corre cada hora en el servidor. El botón "Buscar ahora" ejecuta la búsqueda al instante.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl w-fit">
        {(Object.keys(tabData) as TabKey[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-card-custom text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {tabData[tab].label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Clock className="w-6 h-6 text-zinc-300 animate-spin" />
        </div>
      ) : tabData[activeTab].items.length === 0 ? (
        <EmptyState
          variant="reminders"
          title={tabData[activeTab].emptyMsg}
          description={activeTab === 'pending' ? 'El cron detecta turnos próximos una vez al día. Usá "Buscar ahora" para forzar la búsqueda.' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {tabData[activeTab].items.map(r => (
            <ReminderCard
              key={r.id}
              reminder={r}
              onSent={handleMarkSent}
              onSkip={handleSkip}
            />
          ))}
        </div>
      )}
    </div>
  )
}
