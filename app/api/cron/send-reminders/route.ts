import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

const TZ = 'America/Argentina/Buenos_Aires'

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(iso))
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date(iso))
}

function buildMessage(
  type: '24h' | '2h',
  clientName: string,
  salonName: string,
  appointmentTime: string,
  serviceName: string
): string {
  const hora = formatTime(appointmentTime)
  if (type === '24h') {
    const fecha = formatDate(appointmentTime)
    return `¡Hola ${clientName}! 👋 Te recordamos que mañana tenés un turno en *${salonName}* a las *${hora}* (${fecha}) para *${serviceName}*.\n\n¿Alguna consulta? Escribinos antes de esa hora 😊`
  }
  return `¡Hola ${clientName}! 👋 Tu turno en *${salonName}* es *HOY a las ${hora}* para *${serviceName}*. ¡Ya casi!\n\n¡Te esperamos! ✨`
}

function buildWaUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  // Argentine number normalisation: ensure country code 54, add 9 for mobile
  let number = digits
  if (!number.startsWith('54')) {
    number = number.startsWith('0') ? `549${number.slice(1)}` : `549${number}`
  } else if (number.startsWith('54') && !number.startsWith('549')) {
    number = `549${number.slice(2)}`
  }
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export async function GET(request: Request) {
  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('Authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const adminSupabase = createAdminClient()
  const now = new Date()

  const windows = [
    {
      type: '24h' as const,
      from: new Date(now.getTime() + 23 * 60 * 60 * 1000),
      to:   new Date(now.getTime() + 25 * 60 * 60 * 1000)
    },
    {
      type: '2h' as const,
      from: new Date(now.getTime() + 90 * 60 * 1000),
      to:   new Date(now.getTime() + 150 * 60 * 1000)
    }
  ]

  let totalCreated = 0
  const errors: string[] = []

  for (const win of windows) {
    const { data: appointments, error: apptErr } = await adminSupabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        tenant_id,
        client_name,
        client_phone,
        tenants ( name, enabled_modules ),
        services ( name )
      `)
      .gte('appointment_time', win.from.toISOString())
      .lte('appointment_time', win.to.toISOString())
      .in('status', ['confirmed', 'pending'])

    if (apptErr) {
      errors.push(`[${win.type}] query: ${apptErr.message}`)
      continue
    }

    for (const appt of (appointments ?? [])) {
      const tenant  = appt.tenants as any
      const modules = tenant?.enabled_modules as Record<string, boolean> | null
      if (!modules?.whatsapp) continue

      // Skip if reminder already queued
      const { data: existing } = await adminSupabase
        .from('appointment_reminders')
        .select('id')
        .eq('appointment_id', appt.id)
        .eq('reminder_type', win.type)
        .maybeSingle()

      if (existing) continue

      const clientName  = (appt.client_name  as string) || 'Cliente'
      const clientPhone = (appt.client_phone as string) || ''
      const salonName   = tenant?.name        || 'el salón'
      const serviceName = (appt.services as any)?.name || 'tu servicio'

      const message = buildMessage(win.type, clientName, salonName, appt.appointment_time, serviceName)
      const waUrl   = clientPhone ? buildWaUrl(clientPhone, message) : null

      const { error: insertErr } = await adminSupabase
        .from('appointment_reminders')
        .insert({
          tenant_id:        appt.tenant_id,
          appointment_id:   appt.id,
          reminder_type:    win.type,
          client_name:      clientName,
          client_phone:     clientPhone,
          service_name:     serviceName,
          appointment_time: appt.appointment_time,
          message_text:     message,
          wa_url:           waUrl,
          status:           'pending'
        })

      if (insertErr) {
        // Ignore duplicate key (race condition) silently
        if (!insertErr.message.includes('duplicate')) {
          errors.push(`[${win.type}] insert: ${insertErr.message}`)
        }
      } else {
        totalCreated++
      }
    }
  }

  return NextResponse.json({
    ok:          true,
    created:     totalCreated,
    processedAt: now.toISOString(),
    ...(errors.length > 0 && { errors })
  })
}
