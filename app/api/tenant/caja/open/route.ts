import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    // 1. Verify caller session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 2. Fetch caller's tenant
    const { data: callerProfile, error: callerError } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (callerError || !callerProfile) {
      return NextResponse.json({ error: 'Comercio no asociado o perfil no encontrado.' }, { status: 403 })
    }

    // 3. Parse and validate body
    const body = await request.json()
    const { opening_balance, notes, tenant_id } = body

    let activeTenantId = callerProfile.tenant_id
    if (!activeTenantId && callerProfile.role === 'superadmin') {
      activeTenantId = tenant_id
    }

    if (!activeTenantId) {
      return NextResponse.json({ error: 'Comercio no asociado o perfil no encontrado.' }, { status: 403 })
    }

    if (opening_balance === undefined || Number(opening_balance) < 0) {
      return NextResponse.json({ error: 'El saldo inicial es requerido y debe ser mayor o igual a 0.' }, { status: 400 })
    }

    // 4. Verify if there is already an open cash register
    const { data: openRegister, error: checkError } = await supabase
      .from('cash_registers')
      .select('id')
      .eq('tenant_id', activeTenantId)
      .eq('status', 'open')
      .maybeSingle()

    if (checkError) {
      console.error('Error checking open cash registers:', checkError.message)
      return NextResponse.json({ error: 'Error al verificar las cajas abiertas.' }, { status: 550 })
    }

    if (openRegister) {
      return NextResponse.json({ error: 'Ya existe una caja abierta para este comercio. Debes cerrarla antes de abrir una nueva.' }, { status: 400 })
    }

    // 5. Open new cash register
    const { data: newRegister, error: openError } = await supabase
      .from('cash_registers')
      .insert({
        tenant_id: activeTenantId,
        opened_by: user.id,
        opening_balance: Number(opening_balance),
        status: 'open',
        notes: notes || null
      })
      .select()
      .single()

    if (openError) {
      console.error('Error opening cash register:', openError.message)
      return NextResponse.json({ error: `Error al abrir la caja: ${openError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, register: newRegister })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
