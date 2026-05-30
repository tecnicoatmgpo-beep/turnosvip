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

    if (!id || !email || !role || !tenant_id || !first_name || !last_name || !phone || !address || !locality || !province || !specialty) {
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

    // 5. Update user in Supabase Auth
    const authUpdatePayload: any = {
      email,
      user_metadata: {
        role,
        tenant_id
      }
    }

    if (password && password.trim().length >= 6) {
      authUpdatePayload.password = password.trim()
    }

    const { error: authError } = await adminSupabase.auth.admin.updateUserById(id, authUpdatePayload)

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // 6. Update user profile in public.users
    const { error: profileError } = await adminSupabase
      .from('users')
      .update({
        role,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
        personal_email: personal_email?.trim() || null,
        address: address.trim(),
        locality: locality.trim(),
        province: province.trim(),
        specialty: specialty.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (profileError) {
      return NextResponse.json({ error: `Error al actualizar perfil: ${profileError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
