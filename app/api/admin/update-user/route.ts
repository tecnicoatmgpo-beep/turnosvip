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
