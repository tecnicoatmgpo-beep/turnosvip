import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request) {
  try {
    // 1. Verify caller session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: callerProfile, error: callerError } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (callerError || !callerProfile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { 
      email, 
      password, 
      role, 
      tenant_id,
      first_name,
      last_name,
      phone,
      personal_email,
      address,
      locality,
      province,
      specialty
    } = body

    if (!email || !password || !role || !tenant_id || !first_name || !last_name || !phone || !address || !locality || !province || !specialty) {
      return NextResponse.json({ error: 'Faltan campos obligatorios para el perfil del profesional.' }, { status: 400 })
    }

    // 3. Authorization check: Must be superadmin, or tenant_admin of the same tenant
    const isSuper = callerProfile.role === 'superadmin'
    const isTenantAdmin = callerProfile.role === 'tenant_admin' && callerProfile.tenant_id === tenant_id

    if (!isSuper && !isTenantAdmin) {
      return NextResponse.json({ error: 'Acceso denegado. No tienes permisos para este comercio.' }, { status: 403 })
    }

    // 4. Initialize admin auth client
    const adminSupabase = createAdminClient()

    // 4.5. Subscription Plan Limit Check
    if (role === 'tenant_admin' || role === 'staff') {
      const { data: tenantPlan, error: tenantPlanErr } = await adminSupabase
        .from('tenants')
        .select(`
          plan_id,
          subscription_plans (
            max_staff
          )
        `)
        .eq('id', tenant_id)
        .single()

      if (tenantPlanErr || !tenantPlan) {
        return NextResponse.json({ error: 'No se pudo verificar el plan de suscripción del comercio.' }, { status: 400 })
      }

      const maxStaff = (tenantPlan.subscription_plans as any)?.max_staff

      if (maxStaff !== undefined && maxStaff !== null) {
        const { count, error: countErr } = await adminSupabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant_id)
          .in('role', ['tenant_admin', 'staff'])

        if (countErr) {
          return NextResponse.json({ error: 'Error al verificar el límite de profesionales.' }, { status: 500 })
        }

        if ((count || 0) >= maxStaff) {
          return NextResponse.json({ 
            error: `Límite de profesionales alcanzado. Tu plan actual permite un máximo de ${maxStaff} profesional(es) (incluyendo el administrador).` 
          }, { status: 400 })
        }
      }
    }

    // 5. Create user in Supabase Auth
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role,
        tenant_id,
      }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // 6. Update user profile in public.users with extra staff details
    const { error: profileError } = await adminSupabase
      .from('users')
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
        personal_email: personal_email?.trim() || null,
        address: address.trim(),
        locality: locality.trim(),
        province: province.trim(),
        specialty: specialty.trim()
      })
      .eq('id', authUser.user.id)

    if (profileError) {
      // Rollback Auth user creation if profile insert/update fails
      await adminSupabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: `Error al registrar perfil: ${profileError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: authUser.user })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
