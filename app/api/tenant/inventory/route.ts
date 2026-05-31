import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
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

    // Fetch products
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', callerProfile.tenant_id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (prodError) {
      console.error('Error fetching products:', prodError.message)
      return NextResponse.json({ error: 'Error al consultar el catálogo de productos.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, products })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}

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

    // Role check: Only admin or superadmin can add products
    if (callerProfile.role !== 'tenant_admin' && callerProfile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Permisos insuficientes. Requiere Administrador.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, sku, description, category, cost_price, sale_price, stock, min_stock, supplier } = body

    if (!name || category === undefined) {
      return NextResponse.json({ error: 'El nombre y la categoría son requeridos.' }, { status: 400 })
    }

    const numCost = Number(cost_price || 0)
    const numSale = Number(sale_price || 0)
    const numStock = parseInt(stock || 0, 10)
    const numMinStock = parseInt(min_stock || 0, 10)

    if (numCost < 0 || numSale < 0 || numStock < 0 || numMinStock < 0) {
      return NextResponse.json({ error: 'Los valores numéricos de precio y stock deben ser mayores o iguales a 0.' }, { status: 400 })
    }

    // Insert product
    const { data: newProduct, error: prodError } = await supabase
      .from('products')
      .insert({
        tenant_id: callerProfile.tenant_id,
        name: name.trim(),
        sku: sku ? sku.trim() : null,
        description: description ? description.trim() : null,
        category: category,
        cost_price: numCost,
        sale_price: numSale,
        stock: numStock,
        min_stock: numMinStock,
        supplier: supplier ? supplier.trim() : null,
        is_active: true
      })
      .select()
      .single()

    if (prodError) {
      console.error('Error inserting product:', prodError.message)
      return NextResponse.json({ error: `Error al crear producto: ${prodError.message}` }, { status: 500 })
    }

    // If initial stock is greater than 0, log an initial stock movement!
    if (numStock > 0) {
      const { error: moveError } = await supabase
        .from('stock_movements')
        .insert({
          tenant_id: callerProfile.tenant_id,
          product_id: newProduct.id,
          user_id: user.id,
          type: 'input',
          quantity: numStock,
          previous_stock: 0,
          new_stock: numStock,
          reason: 'Inventario inicial al crear producto'
        })
      
      if (moveError) {
        console.error('Error creating initial stock movement:', moveError.message)
      }
    }

    return NextResponse.json({ success: true, product: newProduct })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
