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
    const { actual_closing_balance, notes } = body

    if (actual_closing_balance === undefined || Number(actual_closing_balance) < 0) {
      return NextResponse.json({ error: 'El saldo real contado de cierre es requerido y debe ser mayor o igual a 0.' }, { status: 400 })
    }

    // 4. Find open cash register session for this tenant
    const { data: activeRegister, error: registerError } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('tenant_id', callerProfile.tenant_id)
      .eq('status', 'open')
      .maybeSingle()

    if (registerError || !activeRegister) {
      return NextResponse.json({ error: 'No hay ninguna caja abierta en este comercio para cerrar.' }, { status: 404 })
    }

    // 5. Query transactions of this session to compute expected balance
    const { data: transactions, error: txError } = await supabase
      .from('cash_transactions')
      .select('type, amount')
      .eq('register_id', activeRegister.id)

    if (txError) {
      console.error('Error fetching transactions for closing:', txError.message)
      return NextResponse.json({ error: 'Error al calcular los movimientos de la caja.' }, { status: 500 })
    }

    let totalIncomes = 0
    let totalExpenses = 0

    transactions?.forEach(tx => {
      const amount = Number(tx.amount)
      if (tx.type === 'income') {
        totalIncomes += amount
      } else {
        totalExpenses += amount
      }
    })

    const expectedClosingBalance = Number(activeRegister.opening_balance) + totalIncomes - totalExpenses
    const actual = Number(actual_closing_balance)
    const discrepancy = actual - expectedClosingBalance

    // 6. Close register
    const { data: closedRegister, error: closeError } = await supabase
      .from('cash_registers')
      .update({
        closed_by: user.id,
        closed_at: new Date().toISOString(),
        expected_closing_balance: expectedClosingBalance,
        actual_closing_balance: actual,
        status: 'closed',
        notes: notes || activeRegister.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', activeRegister.id)
      .select()
      .single()

    if (closeError) {
      console.error('Error closing cash register:', closeError.message)
      return NextResponse.json({ error: `Error al cerrar la caja: ${closeError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      register: closedRegister,
      discrepancy
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
