import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
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

    // 3. Find open cash register session for this tenant
    const { data: activeRegister, error: registerError } = await supabase
      .from('cash_registers')
      .select('*, opened_by_user:users!cash_registers_opened_by_fkey(first_name, last_name, email)')
      .eq('tenant_id', callerProfile.tenant_id)
      .eq('status', 'open')
      .maybeSingle()

    if (registerError) {
      console.error('Error fetching cash register status:', registerError.message)
      return NextResponse.json({ error: 'Error al consultar el estado de la caja.' }, { status: 500 })
    }

    if (!activeRegister) {
      return NextResponse.json({ isOpen: false })
    }

    // If open, fetch summary statistics for the current active register
    // Calculate total incomes and expenses for this session
    const { data: transactions, error: txError } = await supabase
      .from('cash_transactions')
      .select('type, amount, payment_method')
      .eq('register_id', activeRegister.id)

    if (txError) {
      console.error('Error fetching register transactions summary:', txError.message)
      return NextResponse.json({ error: 'Error al resumir las transacciones.' }, { status: 500 })
    }

    let totalIncomes = 0
    let totalExpenses = 0
    let incomesByMethod: Record<string, number> = {
      efectivo: 0,
      transferencia: 0,
      tarjeta_debito: 0,
      tarjeta_credito: 0,
      mercadopago: 0
    }
    let expensesByMethod: Record<string, number> = {
      efectivo: 0,
      transferencia: 0,
      tarjeta_debito: 0,
      tarjeta_credito: 0,
      mercadopago: 0
    }

    transactions?.forEach(tx => {
      const amount = Number(tx.amount)
      if (tx.type === 'income') {
        totalIncomes += amount
        incomesByMethod[tx.payment_method] = (incomesByMethod[tx.payment_method] || 0) + amount
      } else {
        totalExpenses += amount
        expensesByMethod[tx.payment_method] = (expensesByMethod[tx.payment_method] || 0) + amount
      }
    })

    const expectedCashInDrawer = Number(activeRegister.opening_balance) + incomesByMethod.efectivo - expensesByMethod.efectivo
    const expectedClosingBalance = Number(activeRegister.opening_balance) + totalIncomes - totalExpenses

    return NextResponse.json({
      isOpen: true,
      register: activeRegister,
      summary: {
        totalIncomes,
        totalExpenses,
        expectedClosingBalance,
        expectedCashInDrawer,
        byMethod: {
          incomes: incomesByMethod,
          expenses: expensesByMethod
        }
      }
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
