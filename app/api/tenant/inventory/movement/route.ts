import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
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

    if (callerError || !callerProfile || !callerProfile.tenant_id) {
      return NextResponse.json({ error: 'Comercio no asociado o perfil no encontrado.' }, { status: 403 })
    }

    const body = await request.json()
    const { product_id, type, quantity, reason, direction } = body

    if (!product_id || !type || quantity === undefined || !reason) {
      return NextResponse.json({ error: 'Todos los campos son requeridos (product_id, tipo, cantidad y motivo).' }, { status: 400 })
    }

    if (type !== 'input' && type !== 'output' && type !== 'adjustment') {
      return NextResponse.json({ error: 'Tipo de movimiento inválido.' }, { status: 400 })
    }

    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'La cantidad debe ser un número entero mayor a 0.' }, { status: 400 })
    }

    // Role check: Staff cannot perform manual adjustments
    if (type === 'adjustment' && callerProfile.role === 'staff') {
      return NextResponse.json({ error: 'Permisos insuficientes. Los ajustes de arqueo manual están restringidos a administradores.' }, { status: 403 })
    }

    // 1. Fetch current product details and verify ownership
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('id, name, stock')
      .eq('id', product_id)
      .eq('tenant_id', callerProfile.tenant_id)
      .eq('is_active', true)
      .single()

    if (prodError || !product) {
      return NextResponse.json({ error: 'El producto no existe o no pertenece a este comercio.' }, { status: 404 })
    }

    const prevStock = product.stock
    let newStock = prevStock

    if (type === 'input') {
      newStock = prevStock + qty
    } else if (type === 'output') {
      newStock = prevStock - qty
    } else if (type === 'adjustment') {
      if (direction === 'add') {
        newStock = prevStock + qty
      } else if (direction === 'subtract') {
        newStock = prevStock - qty
      } else {
        return NextResponse.json({ error: 'Para tipo "ajuste" se debe especificar la dirección ("add" o "subtract").' }, { status: 400 })
      }
    }

    if (newStock < 0) {
      return NextResponse.json({ error: `Stock insuficiente. Stock actual: ${prevStock}. No se puede reducir a un stock negativo.` }, { status: 400 })
    }

    // 2. Create the stock movement record
    const { data: movement, error: moveError } = await supabase
      .from('stock_movements')
      .insert({
        tenant_id: callerProfile.tenant_id,
        product_id: product.id,
        user_id: user.id,
        type,
        quantity: qty,
        previous_stock: prevStock,
        new_stock: newStock,
        reason: reason.trim()
      })
      .select()
      .single()

    if (moveError) {
      console.error('Error creating stock movement:', moveError.message)
      return NextResponse.json({ error: `Error al registrar movimiento: ${moveError.message}` }, { status: 500 })
    }

    // 3. Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({
        stock: newStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id)

    if (updateError) {
      console.error('Error updating product stock:', updateError.message)
      // Logical rollback: delete movement record to maintain consistency
      await supabase.from('stock_movements').delete().eq('id', movement.id)
      return NextResponse.json({ error: `Error al actualizar stock del producto: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, movement, product_stock: newStock })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
