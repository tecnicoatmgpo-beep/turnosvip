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
    const {
      name,
      slug,
      status,
      plan_id,
      subscription_status,
      trial_ends_at,
      current_period_end,
      admin_email,
      admin_password,
    } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'El nombre y slug son requeridos.' }, { status: 400 })
    }

    // 3. Initialize admin client (bypasses RLS to insert tenant & create auth user)
    const adminSupabase = createAdminClient()

    // 4. Create the Tenant
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .insert([
        {
          name,
          slug,
          status,
          plan_id: plan_id || null,
          subscription_status,
          trial_ends_at: trial_ends_at || null,
          current_period_end: current_period_end || null,
        }
      ])
      .select()
      .single()

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 500 })
    }

    const tenantId = tenant.id

    // 5. If admin credentials are provided, create the user in Supabase Auth
    if (admin_email && admin_password) {
      const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
        email: admin_email,
        password: admin_password,
        email_confirm: true, // Auto-confirm email so they can log in instantly
        user_metadata: {
          role: 'tenant_admin',
          tenant_id: tenantId,
        }
      })

      if (authError) {
        // Rollback: delete created tenant to avoid orphaned records
        await adminSupabase.from('tenants').delete().eq('id', tenantId)
        return NextResponse.json({ error: `Error al crear usuario administrador: ${authError.message}` }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, tenant })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
