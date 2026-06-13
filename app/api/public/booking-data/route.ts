import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Falta el parámetro slug' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Fetch Tenant details
    const { data: tenant, error: tenantErr } = await adminSupabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        status,
        address,
        phone,
        email,
        business_hours,
        blocked_dates,
        plan_id,
        subscription_plans (
          max_appointments_per_month
        )
      `)
      .eq('slug', slug.toLowerCase())
      .single()

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    }

    if (tenant.status === 'suspended') {
      return NextResponse.json({ error: 'Comercio suspendido temporalmente' }, { status: 403 })
    }

    // 2. Validate monthly appointments limit
    const maxAppointments = (tenant.subscription_plans as any)?.max_appointments_per_month
    let limitReached = false
    let currentMonthCount = 0

    if (maxAppointments !== undefined && maxAppointments !== null) {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

      const { count, error: countErr } = await adminSupabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)

      if (!countErr && count !== null) {
        currentMonthCount = count
        if (count >= maxAppointments) {
          limitReached = true
        }
      }
    }

    // 3. Fetch active services
    const { data: services, error: servicesErr } = await adminSupabase
      .from('services')
      .select('id, name, description, duration_minutes, price, category')
      .eq('tenant_id', tenant.id)
      .order('name')

    if (servicesErr) {
      console.error('Error fetching services:', servicesErr.message)
    }

    // 4. Fetch staff members (professionals)
    const { data: staff, error: staffErr } = await adminSupabase
      .from('users')
      .select('id, email, first_name, last_name, specialty')
      .eq('tenant_id', tenant.id)
      .in('role', ['staff', 'tenant_admin'])
      .order('first_name')

    if (staffErr) {
      console.error('Error fetching staff:', staffErr.message)
    }

    // 5. Fetch busy appointments slots for next 30 days
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfNext30Days = new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { data: busySlotsRaw, error: busyErr } = await adminSupabase
      .from('appointments')
      .select(`
        appointment_time, 
        staff_id, 
        services (
          duration_minutes
        )
      `)
      .eq('tenant_id', tenant.id)
      .gte('appointment_time', startOfToday.toISOString())
      .lte('appointment_time', endOfNext30Days.toISOString())
      .in('status', ['confirmed', 'pending', 'completed'])

    if (busyErr) {
      console.error('Error fetching busy slots:', busyErr.message)
    }

    const busySlots = (busySlotsRaw || []).map((appt: any) => ({
      appointment_time: appt.appointment_time,
      staff_id: appt.staff_id,
      duration_minutes: appt.services?.duration_minutes || 30
    }))

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        address: tenant.address,
        phone: tenant.phone,
        email: tenant.email,
        business_hours: (tenant as any).business_hours || null,
        blocked_dates: (tenant as any).blocked_dates || []
      },
      services: services || [],
      staff: staff || [],
      busySlots,
      limitReached
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
