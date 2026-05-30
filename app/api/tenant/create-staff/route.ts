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
    const { email, password, role, tenant_id } = body

    if (!email || !password || !role || !tenant_id) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 })
    }

    // 3. Authorization check: Must be superadmin, or tenant_admin of the same tenant
    const isSuper = callerProfile.role === 'superadmin'
    const isTenantAdmin = callerProfile.role === 'tenant_admin' && callerProfile.tenant_id === tenant_id

    if (!isSuper && !isTenantAdmin) {
      return NextResponse.json({ error: 'Acceso denegado. No tienes permisos para este comercio.' }, { status: 403 })
    }

    // 4. Initialize admin auth client
    const adminSupabase = createAdminClient()

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

    return NextResponse.json({ success: true, user: authUser.user })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
