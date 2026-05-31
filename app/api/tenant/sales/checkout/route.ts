import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Load user profile
    const { data: callerProfile, error: callerError } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (callerError || !callerProfile || !callerProfile.tenant_id) {
      return NextResponse.json({ error: 'Comercio no asociado o perfil no encontrado.' }, { status: 403 })
    }

    const body = await request.json()
    const { customer_id, payment_method, items, notes } = body

    if (!payment_method || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (método de pago e ítems de compra).' }, { status: 400 })
    }

    // 1. Verify open cash register
    const { data: openRegister, error: registerErr } = await supabase
      .from('cash_registers')
      .select('id, status')
      .eq('tenant_id', callerProfile.tenant_id)
      .eq('status', 'open')
      .maybeSingle()

    if (registerErr) {
      console.error('Error querying cash register:', registerErr.message)
      return NextResponse.json({ error: 'Error al verificar el estado de la caja diaria.' }, { status: 500 })
    }

    if (!openRegister) {
      return NextResponse.json({ error: 'La caja diaria se encuentra cerrada. Debes abrir la caja para poder registrar cobros.' }, { status: 400 })
    }

    // Validate payment method
    const validPaymentMethods = ['efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'mercadopago']
    if (!validPaymentMethods.includes(payment_method.toLowerCase())) {
      return NextResponse.json({ error: 'Método de pago inválido.' }, { status: 400 })
    }

    // 2. Validate all products and stock levels
    const validatedItems = []
    let totalAmount = 0

    for (const item of items) {
      const { product_id, quantity, price } = item
      if (!product_id || !quantity || quantity <= 0 || price === undefined || price < 0) {
        return NextResponse.json({ error: 'Datos de producto o cantidad inválidos en el carrito.' }, { status: 400 })
      }

      // Fetch product details
      const { data: product, error: prodErr } = await supabase
        .from('products')
        .select('id, name, stock, cost_price, sale_price, is_active')
        .eq('id', product_id)
        .eq('tenant_id', callerProfile.tenant_id)
        .single()

      if (prodErr || !product || !product.is_active) {
        return NextResponse.json({ error: `El producto con ID ${product_id} no existe o está inactivo.` }, { status: 404 })
      }

      if (product.stock < quantity) {
        return NextResponse.json({ error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${quantity}` }, { status: 400 })
      }

      validatedItems.push({
        product,
        quantity: parseInt(quantity, 10),
        price: Number(price)
      })

      totalAmount += Number(price) * parseInt(quantity, 10)
    }

    // 3. Process the sales transaction step-by-step
    const createdSales = []
    const firstSaleId = null

    for (const valItem of validatedItems) {
      const { product, quantity, price } = valItem
      const prevStock = product.stock
      const newStock = prevStock - quantity

      // A. Create the sale entry
      const { data: saleData, error: saleErr } = await supabase
        .from('sales')
        .insert({
          tenant_id: callerProfile.tenant_id,
          customer_id: customer_id || null, // null for walk-in client
          product_name: product.name,
          quantity,
          price,
          product_id: product.id
        })
        .select()
        .single()

      if (saleErr) {
        console.error('Error inserting sale record:', saleErr.message)
        return NextResponse.json({ error: `Error al registrar la venta del producto: ${saleErr.message}` }, { status: 500 })
      }

      createdSales.push(saleData)

      // B. Deduct product stock
      const { error: updateErr } = await supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', product.id)

      if (updateErr) {
        console.error('Error updating stock:', updateErr.message)
        return NextResponse.json({ error: `Error al actualizar el stock del producto: ${updateErr.message}` }, { status: 500 })
      }

      // C. Log stock movement
      const { error: moveErr } = await supabase
        .from('stock_movements')
        .insert({
          tenant_id: callerProfile.tenant_id,
          product_id: product.id,
          user_id: user.id,
          type: 'output',
          quantity,
          previous_stock: prevStock,
          new_stock: newStock,
          reason: `Venta Mostrador ${customer_id ? '(Ficha de Cliente)' : '(Consumidor Final)'}`
        })

      if (moveErr) {
        console.error('Error logging stock movement:', moveErr.message)
      }
    }

    // 4. Create Daily Cash Register transaction entry
    const { data: transaction, error: txErr } = await supabase
      .from('cash_transactions')
      .insert({
        tenant_id: callerProfile.tenant_id,
        register_id: openRegister.id,
        user_id: user.id,
        type: 'income',
        amount: totalAmount,
        payment_method: payment_method.toLowerCase(),
        category: 'producto',
        reference_id: createdSales[0]?.id || null,
        notes: notes ? notes.trim() : `Venta de mostrador (${createdSales.length} ítems)`
      })
      .select()
      .single()

    if (txErr) {
      console.error('Error creating cash transaction:', txErr.message)
      return NextResponse.json({ error: `Venta procesada pero falló el registro en caja: ${txErr.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sales: createdSales,
      transaction
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
