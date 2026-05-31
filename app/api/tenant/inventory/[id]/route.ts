import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    if (callerProfile.role !== 'tenant_admin' && callerProfile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Permisos insuficientes. Requiere Administrador.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, sku, description, category, cost_price, sale_price, min_stock, supplier } = body

    if (!name || category === undefined) {
      return NextResponse.json({ error: 'El nombre y la categoría son requeridos.' }, { status: 400 })
    }

    const numCost = Number(cost_price || 0)
    const numSale = Number(sale_price || 0)
    const numMinStock = parseInt(min_stock || 0, 10)

    if (numCost < 0 || numSale < 0 || numMinStock < 0) {
      return NextResponse.json({ error: 'Los valores numéricos de precio y stock mínimo deben ser mayores o iguales a 0.' }, { status: 400 })
    }

    // Check if product belongs to this tenant
    const { data: productCheck, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', callerProfile.tenant_id)
      .maybeSingle()

    if (checkError || !productCheck) {
      return NextResponse.json({ error: 'El producto no existe o no pertenece a este comercio.' }, { status: 404 })
    }

    // Update product
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        sku: sku ? sku.trim() : null,
        description: description ? description.trim() : null,
        category: category,
        cost_price: numCost,
        sale_price: numSale,
        min_stock: numMinStock,
        supplier: supplier ? supplier.trim() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating product:', updateError.message)
      return NextResponse.json({ error: `Error al actualizar producto: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, product: updatedProduct })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    if (callerProfile.role !== 'tenant_admin' && callerProfile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Permisos insuficientes. Requiere Administrador.' }, { status: 403 })
    }

    // Perform logical delete (is_active = false)
    const { data: deletedProduct, error: deleteError } = await supabase
      .from('products')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', callerProfile.tenant_id)
      .select()
      .single()

    if (deleteError) {
      console.error('Error logically deleting product:', deleteError.message)
      return NextResponse.json({ error: `Error al desactivar el producto: ${deleteError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Producto eliminado correctamente.' })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
