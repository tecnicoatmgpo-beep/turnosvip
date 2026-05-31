import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request) {
  try {
    // 1. Verify caller is a superadmin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso denegado. Solo superadministradores.' }, { status: 403 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { tenant_id, email, password, role } = body

    if (!tenant_id || !email || !password || !role) {
      return NextResponse.json({ error: 'El ID de comercio, email, contraseña y rol son requeridos.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    // 3. Initialize admin client (bypasses RLS to create user)
    const adminSupabase = createAdminClient()

    // 4. Check if tenant exists
    const { data: tenant, error: tenantErr } = await adminSupabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenant_id)
      .single()

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'El comercio especificado no existe.' }, { status: 404 })
    }

    // 4.5. Check subscription plan limits for professionals
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
            error: `Límite de profesionales alcanzado. El plan de este comercio permite un máximo de ${maxStaff} profesional(es) (incluyendo el administrador).` 
          }, { status: 400 })
        }
      }
    }

    // 5. Create user in Supabase Auth via Admin Auth API
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // Auto-confirm email so they can log in instantly
      user_metadata: {
        role: role,
        tenant_id: tenant_id,
      }
    })

    if (authError) {
      return NextResponse.json({ error: `Error al crear el usuario: ${authError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: authUser.user })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
