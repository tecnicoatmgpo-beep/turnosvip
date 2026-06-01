import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tenant_id,
      client_name,
      client_phone,
      client_email,
      service_id,
      staff_id,
      appointment_time,
      notes
    } = body

    if (!tenant_id || !client_name || !client_phone || !service_id || !staff_id || !appointment_time) {
      return NextResponse.json({ error: 'Faltan campos obligatorios para la reserva del turno.' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Fetch Tenant and validate subscription limits
    const { data: tenant, error: tenantErr } = await adminSupabase
      .from('tenants')
      .select(`
        id,
        status,
        plan_id,
        subscription_plans (
          max_appointments_per_month
        )
      `)
      .eq('id', tenant_id)
      .single()

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    }

    if (tenant.status === 'suspended') {
      return NextResponse.json({ error: 'Comercio suspendido' }, { status: 403 })
    }

    const maxAppointments = (tenant.subscription_plans as any)?.max_appointments_per_month

    if (maxAppointments !== undefined && maxAppointments !== null) {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

      const { count, error: countErr } = await adminSupabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)

      if (countErr) {
        return NextResponse.json({ error: 'Error al verificar límite de suscripción.' }, { status: 500 })
      }

      if ((count || 0) >= maxAppointments) {
        return NextResponse.json({
          error: 'El comercio ha alcanzado el límite de turnos mensuales de su plan de suscripción.'
        }, { status: 400 })
      }
    }

    // 2. Fetch service price to set total_price
    const { data: service, error: serviceErr } = await adminSupabase
      .from('services')
      .select('price')
      .eq('id', service_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (serviceErr || !service) {
      return NextResponse.json({ error: 'Servicio no encontrado en el catálogo de este comercio.' }, { status: 404 })
    }

    // 3. Find or create customer profile by phone number
    let customerId: string | null = null
    const trimmedPhone = client_phone.trim()
    const trimmedName = client_name.trim()

    try {
      // Try to find existing customer by phone within this tenant
      const { data: existingCustomer } = await adminSupabase
        .from('customers')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('phone', trimmedPhone)
        .maybeSingle()

      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        // Create a new customer profile by splitting the full name
        const nameParts = trimmedName.split(' ')
        const firstName = nameParts[0] || trimmedName
        const lastName = nameParts.slice(1).join(' ') || '-'

        const { data: newCustomer, error: customerErr } = await adminSupabase
          .from('customers')
          .insert({
            tenant_id,
            first_name: firstName,
            last_name: lastName,
            phone: trimmedPhone,
            email: client_email?.trim() || null,
            category: 'nuevo'
          })
          .select('id')
          .single()

        if (!customerErr && newCustomer) {
          customerId = newCustomer.id
        }
        // If customer creation fails, we still proceed with the appointment (non-blocking)
      }
    } catch (customerLinkErr) {
      // Customer linking is non-blocking – log but do not fail the appointment
      console.warn('Could not link/create customer profile:', customerLinkErr)
    }

    // 4. Create appointment (appointment_time is already a valid ISO string with correct offset)
    const { data: appointment, error: apptErr } = await adminSupabase
      .from('appointments')
      .insert({
        tenant_id,
        client_name: trimmedName,
        client_phone: trimmedPhone,
        client_email: client_email?.trim() || null,
        service_id,
        staff_id,
        appointment_time: new Date(appointment_time).toISOString(),
        total_price: Number(service.price),
        status: 'pending',
        notes: notes?.trim() || null,
        customer_id: customerId
      })
      .select()
      .single()

    if (apptErr) {
      console.error('Error inserting appointment:', apptErr.message)
      return NextResponse.json({ error: `Error al registrar el turno: ${apptErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, appointment })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
