import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request) {
  try {
    // 1. Verify caller is a superadmin
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (profileError || !currentProfile || currentProfile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso denegado. Solo superadministradores.' }, { status: 403 })
    }

    // 2. Parse request body
    const body = await request.json()
    const {
      id,
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

    if (!id || !email || !role) {
      return NextResponse.json({ error: 'El ID, email y rol son requeridos.' }, { status: 400 })
    }

    if (password && password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    // Prevent demoting the currently logged-in superadmin
    let targetRole = role
    let targetTenantId = tenant_id
    if (id === currentUser.id) {
      targetRole = 'superadmin'
      targetTenantId = null
    }

    // 3. Initialize admin client (bypasses RLS to update auth data)
    const adminSupabase = createAdminClient()

    // 3.1. Fetch existing user profile to see if their role/tenant changes
    const { data: existingUser, error: existErr } = await adminSupabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', id)
      .single()

    if (existErr || !existingUser) {
      return NextResponse.json({ error: 'Usuario a actualizar no encontrado.' }, { status: 404 })
    }

    const wasProfessional = (existingUser.role === 'tenant_admin' || existingUser.role === 'staff') && existingUser.tenant_id === targetTenantId
    const willBeProfessional = (targetRole === 'tenant_admin' || targetRole === 'staff') && targetTenantId !== null

    if (willBeProfessional && !wasProfessional) {
      const { data: tenantPlan, error: tenantPlanErr } = await adminSupabase
        .from('tenants')
        .select(`
          plan_id,
          subscription_plans (
            max_staff
          )
        `)
        .eq('id', targetTenantId)
        .single()

      if (tenantPlanErr || !tenantPlan) {
        return NextResponse.json({ error: 'No se pudo verificar el plan de suscripción del comercio.' }, { status: 400 })
      }

      const maxStaff = (tenantPlan.subscription_plans as any)?.max_staff

      if (maxStaff !== undefined && maxStaff !== null) {
        const { count, error: countErr } = await adminSupabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', targetTenantId)
          .in('role', ['tenant_admin', 'staff'])

        if (countErr) {
          return NextResponse.json({ error: 'Error al verificar el límite de profesionales del comercio.' }, { status: 500 })
        }

        if ((count || 0) >= maxStaff) {
          return NextResponse.json({ 
            error: `Límite de profesionales alcanzado. El plan de este comercio permite un máximo de ${maxStaff} profesional(es) (incluyendo el administrador).` 
          }, { status: 400 })
        }
      }
    }

    // 4. Update user in Supabase Auth via Admin Auth API
    const authUpdateData: any = {
      email: email.trim(),
      user_metadata: {
        role: targetRole,
        tenant_id: targetTenantId,
      }
    }

    if (password) {
      authUpdateData.password = password
    }

    const { data: updatedAuthUser, error: authError } = await adminSupabase.auth.admin.updateUserById(id, authUpdateData)

    if (authError) {
      return NextResponse.json({ error: `Error en la autenticación de Supabase: ${authError.message}` }, { status: 550 })
    }

    // 5. Update user profile in public.users table
    const { error: dbError } = await adminSupabase
      .from('users')
      .update({
        email: email.trim(),
        role: targetRole,
        tenant_id: targetTenantId,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        personal_email: personal_email || null,
        address: address || null,
        locality: locality || null,
        province: province || null,
        specialty: specialty || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (dbError) {
      return NextResponse.json({ error: `Error al actualizar la base de datos pública: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: updatedAuthUser.user })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
