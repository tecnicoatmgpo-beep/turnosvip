import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function DELETE(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('id')

    if (!staffId) {
      return NextResponse.json({ error: 'ID de empleado requerido' }, { status: 400 })
    }

    // Fetch target user profile to verify tenant_id matches
    const { data: targetProfile, error: targetError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', staffId)
      .single()

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Empleado no encontrado en la base de datos pública' }, { status: 404 })
    }

    // Verify permissions: superadmin or tenant_admin of the same tenant
    const isSuper = callerProfile.role === 'superadmin'
    const isTenantAdmin = callerProfile.role === 'tenant_admin' && callerProfile.tenant_id === targetProfile.tenant_id

    if (!isSuper && !isTenantAdmin) {
      return NextResponse.json({ error: 'Acceso denegado. No tienes permisos.' }, { status: 403 })
    }

    // Call admin client to delete target user from Auth
    const adminSupabase = createAdminClient()
    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(staffId)

    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
