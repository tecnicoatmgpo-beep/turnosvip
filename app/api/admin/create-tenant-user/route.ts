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
