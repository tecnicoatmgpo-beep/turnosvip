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

    // Fetch movements with joined products and users
    const { data: movements, error: moveError } = await supabase
      .from('stock_movements')
      .select('*, product:products(name, sku), user:users(first_name, last_name, email)')
      .eq('tenant_id', callerProfile.tenant_id)
      .order('created_at', { ascending: false })

    if (moveError) {
      console.warn('Error fetching stock movements with relation, trying fallback:', moveError.message)
      const rawRes = await supabase
        .from('stock_movements')
        .select('*')
        .eq('tenant_id', callerProfile.tenant_id)
        .order('created_at', { ascending: false })
      
      if (rawRes.error) {
        console.error('Error in fallback movements query:', rawRes.error.message)
        return NextResponse.json({ error: 'Error al consultar historial de movimientos.' }, { status: 500 })
      }

      // Fetch products and users in this tenant to map in memory
      const { data: productsData } = await supabase.from('products').select('id, name, sku').eq('tenant_id', callerProfile.tenant_id)
      const { data: usersData } = await supabase.from('users').select('id, first_name, last_name, email')

      const productMap = new Map(productsData?.map(p => [p.id, p]) || [])
      const userMap = new Map(usersData?.map(u => [u.id, u]) || [])

      const mapped = (rawRes.data || []).map(m => ({
        ...m,
        product: productMap.get(m.product_id) || null,
        user: userMap.get(m.user_id) || null
      }))

      return NextResponse.json({ success: true, movements: mapped })
    }

    return NextResponse.json({ success: true, movements })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
