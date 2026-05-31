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

    if (callerError || !callerProfile || !callerProfile.tenant_id) {
      return NextResponse.json({ error: 'Comercio no asociado o perfil no encontrado.' }, { status: 403 })
    }

    // 3. Parse and validate body
    const body = await request.json()
    const { type, amount, payment_method, category, notes, reference_id } = body

    if (!type || !amount || !payment_method || !category) {
      return NextResponse.json({ error: 'Faltan campos requeridos (tipo, monto, método de pago y categoría).' }, { status: 400 })
    }

    if (type !== 'income' && type !== 'expense') {
      return NextResponse.json({ error: 'El tipo debe ser "income" (ingreso) o "expense" (egreso).' }, { status: 400 })
    }

    const amt = Number(amount)
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json({ error: 'El monto debe ser un número mayor a 0.' }, { status: 400 })
    }

    // 4. Find open cash register session
    const { data: activeRegister, error: registerError } = await supabase
      .from('cash_registers')
      .select('id')
      .eq('tenant_id', callerProfile.tenant_id)
      .eq('status', 'open')
      .maybeSingle()

    if (registerError || !activeRegister) {
      return NextResponse.json({ error: 'Debes abrir la caja antes de registrar transacciones o movimientos.' }, { status: 400 })
    }

    // 5. Create transaction
    const { data: newTx, error: txError } = await supabase
      .from('cash_transactions')
      .insert({
        tenant_id: callerProfile.tenant_id,
        register_id: activeRegister.id,
        user_id: user.id,
        type,
        amount: amt,
        payment_method,
        category,
        reference_id: reference_id || null,
        notes: notes || null
      })
      .select()
      .single()

    if (txError) {
      console.error('Error inserting cash transaction:', txError.message)
      return NextResponse.json({ error: `Error al registrar transacción: ${txError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, transaction: newTx })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
