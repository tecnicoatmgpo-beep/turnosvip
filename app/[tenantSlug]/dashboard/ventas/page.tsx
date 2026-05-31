'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  Wallet, 
  AlertCircle, 
  Printer, 
  ArrowLeft, 
  CheckCircle2, 
  Package, 
  Lock,
  Tag,
  ChevronRight,
  FileText
} from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string | null
  sale_price: number
  stock: number
  category: string
  is_active: boolean
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
}

interface CartItem {
  product: Product
  quantity: number
  price: number // sale price at moment of adding
}

export default function VentasMostradorPage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenantSlug as string

  // State
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantData, setTenantData] = useState<any>(null)
  const [currentUserName, setCurrentUserName] = useState<string>('Personal')

  // Financial status (Caja)
  const [isCajaOpen, setIsCajaOpen] = useState(false)
  const [openRegisterId, setOpenRegisterId] = useState<string | null>(null)

  // Catalog and Customers Data
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // UI Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [customerSearch, setCustomerSearch] = useState('')
  const [isWalkIn, setIsWalkIn] = useState(true) // Consumidor Final
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'mercadopago'>('efectivo')
  const [notes, setNotes] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // Checkout Receipt / Ticket modal
  const [isPostSaleTicketOpen, setIsPostSaleTicketOpen] = useState(false)
  const [postSaleTx, setPostSaleTx] = useState<any>(null)
  const [postSaleItems, setPostSaleItems] = useState<any[]>([])
  const [postSaleCustomerName, setPostSaleCustomerName] = useState('Consumidor Final')

  const supabase = createClient()

  // Load Data
  const loadData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      // 1. Get Tenant details
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .select('id, name, address, cuit, phone, email, activity_start_date')
        .eq('slug', tenantSlug)
        .single()

      if (tenantErr || !tenant) {
        throw new Error('Comercio no encontrado')
      }
      setTenantId(tenant.id)
      setTenantData(tenant)

      // 2. Check Caja Diaria Status
      const res = await fetch(`/api/tenant/caja/status?tenant_id=${tenant.id}`)
      const statusData = await res.json()
      if (res.ok && statusData.isOpen) {
        setIsCajaOpen(true)
        setOpenRegisterId(statusData.register?.id || null)
      } else {
        setIsCajaOpen(false)
      }

      // 3. Fetch Products Catalog
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('id, name, sku, sale_price, stock, category, is_active')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('name')

      if (prodErr) throw prodErr
      setProducts(prodData || [])

      // 4. Fetch Customers
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email')
        .eq('tenant_id', tenant.id)
        .order('first_name')

      if (custErr) throw custErr
      setCustomers(custData || [])

      // 5. Get User Profile for receipt signature
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()
        if (profile) {
          setCurrentUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Personal')
        }
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error al cargar los datos del mostrador.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tenantSlug) {
      loadData()
    }
  }, [tenantSlug])

  // Computed Categories
  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))]

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Filtered Customers (for dropdown)
  const filteredCustomers = customers.filter(c => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase()
    const query = customerSearch.toLowerCase()
    return fullName.includes(query) || c.phone.includes(query)
  })

  // Cart Operations
  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id)
    if (existing) {
      if (existing.quantity >= product.stock) {
        showNotification(`No puedes agregar más unidades de "${product.name}". Stock límite alcanzado.`, 'error')
        return
      }
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      if (product.stock < 1) {
        showNotification(`El producto "${product.name}" no tiene stock disponible.`, 'error')
        return
      }
      setCart([...cart, { product, quantity: 1, price: product.sale_price }])
    }
    showNotification(`"${product.name}" agregado al carrito`, 'success')
  }

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId)
      return
    }

    const item = cart.find(i => i.product.id === productId)
    if (item && newQty > item.product.stock) {
      showNotification(`Stock insuficiente. Solo hay ${item.product.stock} unidades de "${item.product.name}"`, 'error')
      return
    }

    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQty }
        : item
    ))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const showNotification = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(msg)
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(''), 4000)
    }
  }

  // Checkout submit
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isCajaOpen) {
      showNotification('La caja diaria está cerrada. Abre la caja primero.', 'error')
      return
    }
    if (cart.length === 0) {
      showNotification('El carrito de compras está vacío.', 'error')
      return
    }

    setCheckoutLoading(true)
    setErrorMsg('')

    try {
      const selectedCust = !isWalkIn ? customers.find(c => c.id === selectedCustomerId) : null
      const customerName = selectedCust ? `${selectedCust.first_name} ${selectedCust.last_name}` : 'Consumidor Final'

      const response = await fetch('/api/tenant/sales/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: isWalkIn ? null : selectedCustomerId,
          payment_method: paymentMethod,
          items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.price
          })),
          notes: notes.trim() || undefined,
          tenant_id: tenantId
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Fallo al procesar el cobro de venta de mostrador.')
      }

      // Success
      setPostSaleTx(result.transaction)
      setPostSaleItems([...cart])
      setPostSaleCustomerName(customerName)
      
      showNotification('Venta registrada con éxito', 'success')
      setIsPostSaleTicketOpen(true)
      
      // Clean up cart and form
      clearCart()
      setNotes('')
      setSelectedCustomerId('')
      setCustomerSearch('')
      setIsWalkIn(true)

      // Reload stock info
      loadData()
    } catch (err: any) {
      console.error(err)
      showNotification(err.message || 'Error al completar el cobro.', 'error')
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Render Lock screen if Cash register is closed
  if (!loading && !isCajaOpen) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-full text-rose-600 dark:text-rose-400 mb-6 animate-pulse">
          <Lock className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mb-3 tracking-tight">Caja Diaria Cerrada</h2>
        <p className="text-zinc-650 dark:text-zinc-355 text-sm mb-8 max-w-sm">
          No puedes realizar ventas de mostrador en este momento porque la caja del comercio se encuentra cerrada. Debes abrir la caja diaria para poder procesar pagos de productos.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Button 
            onClick={() => router.push(`/${tenantSlug}/dashboard/caja`)}
            className="bg-primary hover:bg-primary-accent text-white font-bold cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            <span>Ir a Apertura de Caja</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push(`/${tenantSlug}/dashboard`)}
            className="cursor-pointer"
          >
            <span>Volver al Dashboard</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-custom pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Venta de Mostrador</h1>
          <p className="text-zinc-505 dark:text-zinc-400 text-sm mt-1">
            Módulo POS rápido para vender productos directo a clientes o consumidor final.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Caja Diaria Abierta</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-250 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-250 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-455 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: PRODUCTS CATALOG (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Search & Filters Card */}
            <div className="bg-white dark:bg-card-custom border border-border-custom rounded-2xl p-4 shadow-sm space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre de producto o SKU/Código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-border-custom rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent dark:bg-zinc-900 dark:border-border-custom dark:text-zinc-100 transition-all placeholder-zinc-400"
                />
              </div>

              {/* Category selector pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-900 border border-border-custom text-zinc-650 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products List Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-zinc-50 dark:bg-zinc-900 border border-border-custom rounded-2xl py-12 text-center text-zinc-450 dark:text-zinc-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron productos en el catálogo</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0
                  const isLowStock = p.stock > 0 && p.stock <= 3
                  
                  return (
                    <div 
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      className={`bg-white dark:bg-card-custom border rounded-2xl p-4 shadow-sm transition-all duration-200 group relative flex flex-col justify-between ${
                        isOutOfStock 
                          ? 'border-zinc-200 dark:border-zinc-800 opacity-60' 
                          : 'border-border-custom hover:shadow-md hover:-translate-y-0.5 cursor-pointer hover:border-primary-accent/50'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">{p.category}</span>
                          {isOutOfStock ? (
                            <span className="bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 px-2 py-0.5 rounded text-[9px] font-bold">Sin Stock</span>
                          ) : isLowStock ? (
                            <span className="bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400 px-2 py-0.5 rounded text-[9px] font-bold">Bajo Stock: {p.stock}</span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold">Stock: {p.stock}</span>
                          )}
                        </div>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-primary transition-colors text-sm line-clamp-2">
                          {p.name}
                        </h3>
                        {p.sku && (
                          <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono">SKU: {p.sku}</p>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-50 dark:border-zinc-900">
                        <span className="text-base font-extrabold text-primary dark:text-primary-hover">
                          {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p.sale_price)}
                        </span>
                        
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isOutOfStock
                              ? 'border-zinc-200 text-zinc-300 dark:border-zinc-800 dark:text-zinc-700 cursor-not-allowed'
                              : 'border-primary/20 text-primary bg-primary-light hover:bg-primary hover:text-white dark:border-primary-accent/20 dark:text-primary-hover dark:bg-primary-light/10 dark:hover:bg-primary-accent cursor-pointer'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT: SHOPPING CART & CHECKOUT (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-card-custom border border-border-custom rounded-3xl p-5 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border-custom pb-3">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <span>Carrito de Compras</span>
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vaciar</span>
                </button>
              )}
            </div>

            {/* Cart Items list */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-zinc-450 dark:text-zinc-500 border border-dashed border-border-custom rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">El carrito está vacío</p>
                <p className="text-[10px] text-zinc-400 mt-1">Haz clic en los productos del catálogo a la izquierda para agregarlos</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 border border-border-custom rounded-2xl text-xs">
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.product.name}</h4>
                      <div className="text-zinc-500 flex items-center gap-1.5">
                        <span>P. Unit: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.price)}</span>
                        <span>•</span>
                        <span className="font-semibold text-primary dark:text-primary-hover">Subtotal: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.price * item.quantity)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Qty incrementors */}
                      <div className="flex items-center bg-white dark:bg-card-custom border border-border-custom rounded-lg overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 font-bold text-zinc-900 dark:text-zinc-50 text-xs">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Customer checkout settings */}
            <div className="border-t border-border-custom pt-5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-zinc-450 dark:text-zinc-500 tracking-wider">Detalles de Facturación</h3>
              
              {/* Customer Selector / Walk-in Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-border-custom rounded-xl p-2.5">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">¿Consumidor Final (Sin registrar)?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isWalkIn} 
                      onChange={(e) => {
                        setIsWalkIn(e.target.checked)
                        if (e.target.checked) {
                          setSelectedCustomerId('')
                          setCustomerSearch('')
                        }
                      }}
                      className="sr-only peer cursor-pointer" 
                    />
                    <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:height-4 after:width-4 after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {!isWalkIn && (
                  <div className="space-y-1.5 relative">
                    <label className="text-[11px] font-bold text-zinc-650 dark:text-zinc-350">Seleccionar Cliente</label>
                    <select
                      value={selectedCustomerId}
                      required={!isWalkIn}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value)
                        const matched = customers.find(c => c.id === e.target.value)
                        setCustomerSearch(matched ? `${matched.first_name} ${matched.last_name}` : '')
                      }}
                      className="w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent dark:bg-card-custom dark:border-border-custom dark:text-zinc-100 transition-all cursor-pointer"
                    >
                      <option value="">-- Elige un cliente registrado --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name} ({c.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-650 dark:text-zinc-350">Método de Pago</label>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  options={[
                    { label: 'Efectivo', value: 'efectivo' },
                    { label: 'Transferencia Bancaria', value: 'transferencia' },
                    { label: 'Tarjeta de Débito', value: 'tarjeta_debito' },
                    { label: 'Tarjeta de Crédito', value: 'tarjeta_credito' },
                    { label: 'MercadoPago', value: 'mercadopago' },
                  ]}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-650 dark:text-zinc-350">Notas de Venta (Opcional)</label>
                <textarea
                  placeholder="Ej. Entregado con bolsa. Descuento aplicado por promo."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-card-custom border border-border-custom rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-accent min-h-[50px] max-h-[80px]"
                />
              </div>
            </div>

            {/* Total summary breakdown and submit button */}
            <div className="border-t border-border-custom pt-5 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Subtotal</span>
                  <span>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                  <span>Total a Pagar</span>
                  <span className="text-xl text-primary dark:text-primary-hover">
                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cartTotal)}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading || cart.length === 0}
                className="w-full bg-primary hover:bg-primary-accent text-white font-bold py-3 text-sm rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Confirmar Venta y Cobrar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POST SALE TICKET PRINT PREVIEW */}
      <Modal
        isOpen={isPostSaleTicketOpen}
        onClose={() => setIsPostSaleTicketOpen(false)}
        title="Venta de Mostrador Registrada con Éxito"
        size="md"
      >
        <div className="space-y-6">
          {/* Thermal Ticket Monospace view */}
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-inner max-w-sm mx-auto font-mono text-zinc-900 dark:text-zinc-100 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-200 via-transparent to-transparent bg-repeat-x bg-[length:10px_4px]"></div>
            
            <div className="text-center space-y-1">
              <h4 className="font-bold text-sm tracking-tight">{tenantData?.name?.toUpperCase()}</h4>
              {tenantData?.cuit && <p className="text-[9px] text-zinc-550 dark:text-zinc-400">CUIT: {tenantData.cuit}</p>}
              {tenantData?.address && <p className="text-[9px] text-zinc-550 dark:text-zinc-400">Dir: {tenantData.address}</p>}
              {tenantData?.phone && <p className="text-[9px] text-zinc-550 dark:text-zinc-400">Tel: {tenantData.phone}</p>}
              {tenantData?.email && <p className="text-[9px] text-zinc-550 dark:text-zinc-400">Email: {tenantData.email}</p>}
              {tenantData?.activity_start_date && <p className="text-[9px] text-zinc-550 dark:text-zinc-400">Inicio Act: {tenantData.activity_start_date}</p>}
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-1 font-bold">Ticket de Pago de Venta de Mostrador</p>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500">
                {postSaleTx && new Date(postSaleTx.created_at).toLocaleString()}
              </p>
            </div>
            
            <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-3"></div>
            
            <div className="text-[10px] text-zinc-700 dark:text-zinc-300 space-y-1">
              <p><strong>Ticket ID:</strong> #{postSaleTx ? postSaleTx.id.slice(0, 8).toUpperCase() : ''}</p>
              <p><strong>Operador:</strong> {currentUserName}</p>
              <p><strong>Cliente:</strong> {postSaleCustomerName}</p>
            </div>
            
            <div className="border-t border-zinc-300 dark:border-zinc-700 my-3"></div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-bold border-b border-zinc-200 dark:border-zinc-800 pb-1">
                <span>Producto [Cant]</span>
                <span>Total</span>
              </div>
              {postSaleItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <span className="truncate max-w-[200px]">{item.product.name} [x{item.quantity}]</span>
                  <span className="font-semibold">{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-3"></div>
            
            <div className="text-[10px] text-zinc-700 dark:text-zinc-300 space-y-1 text-right">
              <p>Método de Pago: {postSaleTx ? (postSaleTx.payment_method === 'efectivo' ? 'Efectivo' : postSaleTx.payment_method === 'transferencia' ? 'Transferencia' : postSaleTx.payment_method === 'tarjeta_debito' ? 'Tarjeta Débito' : postSaleTx.payment_method === 'tarjeta_credito' ? 'Tarjeta Crédito' : 'MercadoPago') : ''}</p>
              <p className="font-bold text-sm">TOTAL: {postSaleTx && new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(postSaleTx.amount)}</p>
            </div>

            <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-3"></div>

            <div className="text-center text-[10px] font-bold tracking-wider text-zinc-800 dark:text-zinc-200 bg-zinc-150 dark:bg-zinc-800/50 py-1 rounded">
              NO VÁLIDO COMO FACTURA
            </div>

            <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-3"></div>

            <div className="text-center text-[9px] text-zinc-450 dark:text-zinc-500 space-y-0.5">
              <p>¡Gracias por su compra!</p>
              <p>miturnovip.com</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsPostSaleTicketOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              onClick={() => {
                // Setup print-only ticket elements in window
                const printDiv = document.createElement('div')
                printDiv.id = 'thermal-ticket-print-temp'
                printDiv.style.fontFamily = 'monospace'
                printDiv.style.fontSize = '12px'
                printDiv.style.padding = '10px'
                printDiv.style.width = '80mm'
                
                let itemsHtml = ''
                postSaleItems.forEach(item => {
                  itemsHtml += `
                    <tr>
                      <td style="padding-top: 5px;">${item.product.name} [x${item.quantity}]</td>
                      <td style="text-align: right; padding-top: 5px; font-weight: bold;">
                        ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.price * item.quantity)}
                      </td>
                    </tr>
                  `
                })

                printDiv.innerHTML = `
                  <div style="text-align: center; margin-bottom: 15px;">
                    <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">${tenantData?.name?.toUpperCase() || ''}</h3>
                    ${tenantData?.cuit ? `<p style="margin: 2px 0; font-size: 10px;">CUIT: ${tenantData.cuit}</p>` : ''}
                    ${tenantData?.address ? `<p style="margin: 2px 0; font-size: 10px;">Dir: ${tenantData.address}</p>` : ''}
                    ${tenantData?.phone ? `<p style="margin: 2px 0; font-size: 10px;">Tel: ${tenantData.phone}</p>` : ''}
                    ${tenantData?.email ? `<p style="margin: 2px 0; font-size: 10px;">Email: ${tenantData.email}</p>` : ''}
                    ${tenantData?.activity_start_date ? `<p style="margin: 2px 0; font-size: 10px;">Inicio Act: ${tenantData.activity_start_date}</p>` : ''}
                    <p style="margin: 5px 0 0 0; font-size: 10px; font-weight: bold;">Mi Turno VIP POS System</p>
                    <p style="margin: 0; font-size: 10px;">Fecha: ${postSaleTx ? new Date(postSaleTx.created_at).toLocaleString() : ''}</p>
                  </div>
                  <div style="border-bottom: 1px dashed #000; margin-bottom: 10px;"></div>
                  <div style="font-size: 11px; margin-bottom: 10px;">
                    <p style="margin: 3px 0"><strong>Ticket ID:</strong> #${postSaleTx ? postSaleTx.id.slice(0, 8).toUpperCase() : ''}</p>
                    <p style="margin: 3px 0"><strong>Operador:</strong> ${currentUserName}</p>
                    <p style="margin: 3px 0"><strong>Cliente:</strong> ${postSaleCustomerName || ''}</p>
                  </div>
                  <div style="border-bottom: 1px dashed #000; margin-bottom: 10px;"></div>
                  <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 1px solid #000;">
                        <th style="text-align: left; padding-bottom: 5px;">Concepto</th>
                        <th style="text-align: right; padding-bottom: 5px;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                  <div style="border-bottom: 1px dashed #000; margin: 15px 0 10px 0;"></div>
                  <div style="font-size: 11px; text-align: right;">
                    <p style="margin: 3px 0"><strong>Método:</strong> ${postSaleTx ? (postSaleTx.payment_method === 'efectivo' ? 'Efectivo' : postSaleTx.payment_method === 'transferencia' ? 'Transferencia' : postSaleTx.payment_method === 'tarjeta_debito' ? 'Tarjeta Débito' : postSaleTx.payment_method === 'tarjeta_credito' ? 'Tarjeta Crédito' : 'MercadoPago') : ''}</p>
                    <p style="margin: 3px 0; font-size: 14px;"><strong>TOTAL:</strong> ${postSaleTx ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(postSaleTx.amount) : ''}</p>
                  </div>
                  <div style="border-bottom: 1px dashed #000; margin: 15px 0 10px 0;"></div>
                  <div style="text-align: center; font-size: 11px; font-weight: bold; border: 1px solid #000; padding: 3px 0; margin-bottom: 10px;">
                    NO VÁLIDO COMO FACTURA
                  </div>
                  <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
                  <div style="text-align: center; font-size: 10px;">
                    <p style="margin: 5px 0">¡Gracias por su compra!</p>
                    <p style="margin: 0">miturnovip.com</p>
                  </div>
                `
                
                // Add temporary style block for print formatting
                const style = document.createElement('style')
                style.innerHTML = `
                  @media print {
                    body > * {
                      display: none !important;
                    }
                    #thermal-ticket-print-temp {
                      display: block !important;
                    }
                  }
                `
                document.body.appendChild(printDiv)
                document.head.appendChild(style)
                window.print()
                document.body.removeChild(printDiv)
                document.head.removeChild(style)
              }}
              className="inline-flex items-center gap-1.5 bg-primary text-white cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
