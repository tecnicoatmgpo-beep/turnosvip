'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { 
  Package, Search, PlusCircle, AlertCircle, TrendingUp, BarChart2,
  TrendingDown, RotateCcw, ClipboardList, Info, Loader2, Edit, Trash2, 
  History, ArrowUp, ArrowDown, User, AlertTriangle, ShieldCheck, Tag, XCircle
} from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  category: string
  cost_price: number
  sale_price: number
  stock: number
  min_stock: number
  supplier: string | null
  is_active: boolean
  created_at: string
}

interface StockMovement {
  id: string
  product_id: string
  user_id: string
  type: 'input' | 'output' | 'adjustment'
  quantity: number
  previous_stock: number
  new_stock: number
  reason: string
  created_at: string
  product?: {
    name: string
    sku: string | null
  }
  user?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  }
}

const categories = ['Capilares', 'Faciales', 'Corporal', 'Insumos', 'Herramientas', 'Otro']

const movementTypeLabels: Record<string, string> = {
  input: 'Ingreso',
  output: 'Egreso / Consumo',
  adjustment: 'Ajuste Manual'
}

export default function InventoryPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  // Session & User Info
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('staff')

  // Loading States
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingMovements, setLoadingMovements] = useState(true)
  const [submittingProduct, setSubmittingProduct] = useState(false)
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false)

  // Catalog & Movements State
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])

  // UI Tabs State
  const [activeTab, setActiveTab] = useState<'catalog' | 'audit'>('catalog')

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProductForAdjustment, setSelectedProductForAdjustment] = useState<Product | null>(null)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All')
  const [onlyLowStockFilter, setOnlyLowStockFilter] = useState(false)

  // Product Form Input States
  const [prodName, setProdName] = useState('')
  const [prodSku, setProdSku] = useState('')
  const [prodDescription, setProdDescription] = useState('')
  const [prodCategory, setProdCategory] = useState('Capilares')
  const [prodCostPrice, setProdCostPrice] = useState('0')
  const [prodSalePrice, setProdSalePrice] = useState('0')
  const [prodInitialStock, setProdInitialStock] = useState('0')
  const [prodMinStock, setProdMinStock] = useState('3')
  const [prodSupplier, setProdSupplier] = useState('')

  // Adjustment Form Input States
  const [adjType, setAdjType] = useState<'input' | 'output' | 'adjustment'>('input')
  const [adjDirection, setAdjDirection] = useState<'add' | 'subtract'>('add')
  const [adjQuantity, setAdjQuantity] = useState('1')
  const [adjReason, setAdjReason] = useState('')

  // Notifications
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const showNotification = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(msg)
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(''), 4000)
    }
  }

  // Load tenant ID & User profile
  useEffect(() => {
    const initPage = async () => {
      const supabase = createClient()
      
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single()
      
      if (tenant) {
        setTenantId(tenant.id)
        
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
          
          if (profile) {
            setUserRole(profile.role || 'staff')
          }
        }

        await fetchProducts()
        await fetchMovements()
      }
    }

    if (tenantSlug) {
      initPage()
    }
  }, [tenantSlug])

  // Fetch catalog products
  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const res = await fetch('/api/tenant/inventory')
      const data = await res.json()
      if (res.ok && data.success) {
        setProducts(data.products || [])
      } else {
        throw new Error(data.error || 'Error al obtener el inventario')
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoadingProducts(false)
    }
  }

  // Fetch movements log
  const fetchMovements = async () => {
    setLoadingMovements(true)
    try {
      const res = await fetch('/api/tenant/inventory/movements')
      const data = await res.json()
      if (res.ok && data.success) {
        setMovements(data.movements || [])
      } else {
        throw new Error(data.error || 'Error al obtener movimientos')
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoadingMovements(false)
    }
  }

  // Handle New Product or Edit
  const handleOpenNewProductModal = () => {
    setEditingProduct(null)
    setProdName('')
    setProdSku('')
    setProdDescription('')
    setProdCategory('Capilares')
    setProdCostPrice('0')
    setProdSalePrice('0')
    setProdInitialStock('0')
    setProdMinStock('3')
    setProdSupplier('')
    setIsProductModalOpen(true)
  }

  const handleOpenEditProductModal = (product: Product) => {
    setEditingProduct(product)
    setProdName(product.name)
    setProdSku(product.sku || '')
    setProdDescription(product.description || '')
    setProdCategory(product.category)
    setProdCostPrice(product.cost_price.toString())
    setProdSalePrice(product.sale_price.toString())
    setProdInitialStock(product.stock.toString()) // read-only on edit
    setProdMinStock(product.min_stock.toString())
    setProdSupplier(product.supplier || '')
    setIsProductModalOpen(true)
  }

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingProduct(true)
    setErrorMsg('')
    try {
      const url = editingProduct 
        ? `/api/tenant/inventory/${editingProduct.id}` 
        : '/api/tenant/inventory'
      
      const method = editingProduct ? 'PUT' : 'POST'
      
      const bodyPayload = {
        name: prodName,
        sku: prodSku || null,
        description: prodDescription || null,
        category: prodCategory,
        cost_price: Number(prodCostPrice),
        sale_price: Number(prodSalePrice),
        stock: Number(prodInitialStock),
        min_stock: Number(prodMinStock),
        supplier: prodSupplier || null
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el producto.')
      }

      showNotification(
        editingProduct 
          ? 'Producto actualizado con éxito' 
          : 'Producto creado y registrado con éxito', 
        'success'
      )
      setIsProductModalOpen(false)
      await fetchProducts()
      await fetchMovements()
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al procesar el producto.')
    } finally {
      setSubmittingProduct(false)
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el producto "${product.name}"? Se desactivará del catálogo pero conservará su historial de ventas.`)) {
      return
    }

    try {
      const res = await fetch(`/api/tenant/inventory/${product.id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar producto')
      }
      showNotification('Producto eliminado del catálogo.', 'success')
      await fetchProducts()
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar el producto.', 'error')
    }
  }

  // Handle Quick Stock Adjustment
  const handleOpenAdjustmentModal = (product: Product) => {
    setSelectedProductForAdjustment(product)
    setAdjType('input')
    setAdjDirection('add')
    setAdjQuantity('1')
    setAdjReason('')
    setIsAdjustmentModalOpen(true)
  }

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductForAdjustment) return
    setSubmittingAdjustment(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/tenant/inventory/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductForAdjustment.id,
          type: adjType,
          quantity: Number(adjQuantity),
          reason: adjReason,
          direction: adjType === 'adjustment' ? adjDirection : undefined
        })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar el movimiento.')
      }

      showNotification('Movimiento de stock registrado con éxito.', 'success')
      setIsAdjustmentModalOpen(false)
      await fetchProducts()
      await fetchMovements()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar movimiento.')
    } finally {
      setSubmittingAdjustment(false)
    }
  }

  // Filter Catalog lists
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategoryFilter === 'All' || p.category === selectedCategoryFilter
    
    const isLowStock = p.stock <= p.min_stock
    const matchesLowStock = !onlyLowStockFilter || isLowStock

    return matchesSearch && matchesCategory && matchesLowStock
  })

  // Calculations for KPIs
  const totalItems = products.length
  const outOfStockCount = products.filter(p => p.stock === 0).length
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.min_stock).length
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.stock * p.cost_price), 0)

  const isUserStaff = userRole === 'staff'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Inventario y Stock de Mercadería
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gestiona el catálogo de insumos y productos para venta, controla alertas de stock y audita movimientos.
          </p>
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {activeTab === 'catalog' && !isUserStaff && (
            <Button
              onClick={handleOpenNewProductModal}
              className="flex items-center gap-1.5 size-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </Button>
          )}

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-border-custom">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-white dark:bg-card-custom text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Catálogo
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-white dark:bg-card-custom text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Bitácora
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-lg flex items-start gap-3 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-500/30 text-rose-800 dark:text-rose-300 p-4 rounded-lg flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total catalog items */}
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-4 shadow-2xs">
          <div className="text-xs text-zinc-450 dark:text-zinc-400 font-semibold uppercase tracking-wide">Productos Registrados</div>
          <div className="text-lg md:text-xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">{totalItems}</div>
        </div>

        {/* Assets total value */}
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-4 shadow-2xs">
          <div className="text-xs text-zinc-450 dark:text-zinc-400 font-semibold uppercase tracking-wide flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            Valor de Inventario (Costo)
          </div>
          <div className="text-lg md:text-xl font-extrabold text-primary dark:text-primary-hover mt-1">
            ${totalInventoryValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Stock Crítico (Out of Stock) */}
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-4 shadow-2xs">
          <div className="text-xs text-zinc-450 dark:text-zinc-400 font-semibold uppercase tracking-wide flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Sin Stock (Crítico)
          </div>
          <div className={`text-lg md:text-xl font-extrabold mt-1 ${outOfStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-650'}`}>
            {outOfStockCount}
          </div>
        </div>

        {/* Stock Bajo (Under Min Stock) */}
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-4 shadow-2xs">
          <div className="text-xs text-zinc-450 dark:text-zinc-400 font-semibold uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Stock Bajo (Alerta)
          </div>
          <div className={`text-lg md:text-xl font-extrabold mt-1 ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-zinc-650'}`}>
            {lowStockCount}
          </div>
        </div>
      </div>

      {/* CATALOG VIEW TAB */}
      {activeTab === 'catalog' && (
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-custom/50 pb-5">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Text Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por producto o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-border-custom rounded-lg bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-primary-accent"
                />
              </div>

              {/* Category Select */}
              <div className="w-full sm:w-48">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-border-custom rounded-lg bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-primary-accent"
                >
                  <option value="All">Todas las Categorías</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkbox filter for Alerts */}
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyLowStockFilter}
                onChange={(e) => setOnlyLowStockFilter(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
              <span>Mostrar solo Alertas de Stock Bajo / Crítico</span>
            </label>
          </div>

          {/* Loader */}
          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-xs text-zinc-550 dark:text-zinc-400">Cargando catálogo de mercadería...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border-custom rounded-xl">
              <Package className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
              <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">No se encontraron productos en el catálogo.</span>
            </div>
          ) : (
            /* Catalog Grid Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-zinc-450 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-semibold">
                    <th className="pb-3 font-semibold">Producto / Descripción</th>
                    <th className="pb-3 font-semibold">Categoría</th>
                    <th className="pb-3 font-semibold text-right">Precio Costo</th>
                    <th className="pb-3 font-semibold text-right">Precio Venta</th>
                    <th className="pb-3 font-semibold text-right">Ganancia (M.)</th>
                    <th className="pb-3 font-semibold text-center">Stock / Mínimo</th>
                    <th className="pb-3 font-semibold text-right">Proveedor</th>
                    <th className="pb-3 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {filteredProducts.map((p) => {
                    const profitMargin = p.sale_price - p.cost_price
                    const isLowStock = p.stock <= p.min_stock
                    const isOutOfStock = p.stock === 0

                    return (
                      <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="py-3.5">
                          <div className="font-bold text-zinc-800 dark:text-zinc-100">{p.name}</div>
                          {p.sku && (
                            <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">SKU: {p.sku}</div>
                          )}
                          {p.description && (
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1 max-w-[200px]" title={p.description}>{p.description}</div>
                          )}
                        </td>
                        <td className="py-3.5 font-semibold text-zinc-600 dark:text-zinc-400">{p.category}</td>
                        <td className="py-3.5 text-right font-medium text-zinc-500 dark:text-zinc-400">${p.cost_price.toLocaleString('es-AR')}</td>
                        <td className="py-3.5 text-right font-bold text-zinc-800 dark:text-zinc-150">${p.sale_price.toLocaleString('es-AR')}</td>
                        <td className="py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">${profitMargin.toLocaleString('es-AR')}</td>
                        <td className="py-3.5 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isOutOfStock 
                                ? 'bg-red-50 text-red-700 border border-red-150 dark:bg-red-950/20 dark:text-red-400' 
                                : isLowStock 
                                ? 'bg-amber-50 text-amber-700 border border-amber-150 dark:bg-amber-950/20 dark:text-amber-400' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400'
                            }`}>
                              {p.stock} / {p.min_stock} uds.
                            </span>
                            
                            {/* Alert labels */}
                            {isOutOfStock ? (
                              <span className="text-[8px] text-red-500 font-bold uppercase tracking-wider">Agotado</span>
                            ) : isLowStock ? (
                              <span className="text-[8px] text-amber-500 font-bold uppercase tracking-wider">Stock Bajo</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3.5 text-right text-zinc-550 dark:text-zinc-400">{p.supplier || '-'}</td>
                        <td className="py-3.5 text-center">
                          <div className="flex justify-center gap-2">
                            {/* Adjust Stock (Available for everyone) */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAdjustmentModal(p)}
                              title="Ajustar Stock (Ingreso/Merma)"
                              className="px-2 py-1 text-[10px] flex items-center gap-1 border-primary/20 text-primary hover:bg-primary-light"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Ajustar</span>
                            </Button>

                            {/* Edit (Admin only) */}
                            {!isUserStaff && (
                              <button
                                onClick={() => handleOpenEditProductModal(p)}
                                className="p-1 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 cursor-pointer"
                                title="Editar detalles"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete (Admin only) */}
                            {!isUserStaff && (
                              <button
                                onClick={() => handleDeleteProduct(p)}
                                className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer"
                                title="Eliminar del catálogo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* AUDIT LOG VIEW TAB */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 font-bold">Bitácora de Auditoría de Inventario</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Historial completo y cronológico de variaciones de stock registradas en el sistema.</p>
          </div>

          {loadingMovements ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-xs text-zinc-550 dark:text-zinc-400">Cargando bitácora de stock...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border-custom rounded-xl">
              <History className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
              <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Aún no se registran movimientos de inventario en este comercio.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-zinc-450 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-semibold">
                    <th className="pb-3 font-semibold">Fecha / Hora</th>
                    <th className="pb-3 font-semibold">Producto</th>
                    <th className="pb-3 font-semibold">Operación</th>
                    <th className="pb-3 font-semibold text-center">Cantidad</th>
                    <th className="pb-3 font-semibold text-center">Stock (Prev/Nuevo)</th>
                    <th className="pb-3 font-semibold">Operador</th>
                    <th className="pb-3">Motivo / Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {movements.map((move) => {
                    const operatorName = move.user 
                      ? `${move.user.first_name || ''} ${move.user.last_name || ''}`.trim() || move.user.email?.split('@')[0]
                      : 'Sistema'
                    
                    const isInc = move.type === 'input'
                    const isDec = move.type === 'output'

                    return (
                      <tr key={move.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="py-3.5 text-zinc-500 whitespace-nowrap">
                          {new Date(move.created_at).toLocaleString('es-AR', {
                            day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5">
                          <div className="font-bold text-zinc-800 dark:text-zinc-200">{move.product?.name || 'Producto Eliminado'}</div>
                          {move.product?.sku && (
                            <div className="text-[9px] text-zinc-400 font-mono mt-0.5">SKU: {move.product.sku}</div>
                          )}
                        </td>
                        <td className="py-3.5 whitespace-nowrap">
                          {isInc ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
                              <ArrowUp className="w-3 h-3" />
                              Ingreso
                            </span>
                          ) : isDec ? (
                            <span className="inline-flex items-center gap-0.5 text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
                              <ArrowDown className="w-3 h-3" />
                              Egreso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
                              <RotateCcw className="w-3 h-3" />
                              Ajuste
                            </span>
                          )}
                        </td>
                        <td className={`py-3.5 text-center font-extrabold text-sm ${
                          isInc ? 'text-emerald-600 dark:text-emerald-400' : isDec ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-650'
                        }`}>
                          {isInc ? '+' : isDec ? '-' : ''}{move.quantity}
                        </td>
                        <td className="py-3.5 text-center font-semibold text-zinc-550 dark:text-zinc-450 whitespace-nowrap">
                          {move.previous_stock} → <span className="font-bold text-zinc-800 dark:text-zinc-150">{move.new_stock}</span>
                        </td>
                        <td className="py-3.5 font-bold text-zinc-700 dark:text-zinc-350">{operatorName}</td>
                        <td className="py-3.5 text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate" title={move.reason}>{move.reason}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT PRODUCT */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Editar Producto del Catálogo' : 'Registrar Nuevo Producto'}
        size="lg"
      >
        <form onSubmit={handleSubmitProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre del Producto"
              type="text"
              required
              placeholder="Ej: Champú Algas Marinas 500ml"
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
            />
            <Input
              label="Código de Barras / SKU (Opcional)"
              type="text"
              placeholder="Ej: 779123456789"
              value={prodSku}
              onChange={(e) => setProdSku(e.target.value)}
            />
          </div>

          <Input
            label="Descripción del Producto"
            type="text"
            placeholder="Detalles sobre uso, dosificación o características"
            value={prodDescription}
            onChange={(e) => setProdDescription(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Categoría"
              options={categories.map(cat => ({ label: cat, value: cat }))}
              value={prodCategory}
              onChange={(e: any) => setProdCategory(e.target.value)}
            />

            <Input
              label="Proveedor / Distribuidor"
              type="text"
              placeholder="Ej: Cosmética La Pampa Distribuidora"
              value={prodSupplier}
              onChange={(e) => setProdSupplier(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-900/20 p-4 border border-border-custom rounded-xl">
            <Input
              label="Precio Costo"
              type="number"
              min="0"
              step="any"
              required
              value={prodCostPrice}
              onChange={(e) => setProdCostPrice(e.target.value)}
            />

            <Input
              label="Precio Venta"
              type="number"
              min="0"
              step="any"
              required
              value={prodSalePrice}
              onChange={(e) => setProdSalePrice(e.target.value)}
            />

            <Input
              label={editingProduct ? "Stock (Bloqueado)" : "Stock Inicial"}
              type="number"
              min="0"
              required
              disabled={!!editingProduct}
              value={prodInitialStock}
              onChange={(e) => setProdInitialStock(e.target.value)}
            />

            <Input
              label="Stock Mínimo (Alerta)"
              type="number"
              min="0"
              required
              value={prodMinStock}
              onChange={(e) => setProdMinStock(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button variant="ghost" type="button" onClick={() => setIsProductModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={submittingProduct}>
              {submittingProduct ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Guardando...</span>
                </>
              ) : (
                'Guardar Producto'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: QUICK STOCK ADJUSTMENT */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title={`Ajuste y Control de Stock - ${selectedProductForAdjustment?.name}`}
        size="md"
      >
        <form onSubmit={handleSubmitAdjustment} className="space-y-4">
          <div className="bg-zinc-50 dark:bg-zinc-900/35 border border-border-custom p-3 rounded-lg flex justify-between items-center text-xs">
            <div>
              <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[9px] block">Stock Disponible Actual</span>
              <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{selectedProductForAdjustment?.stock} unidades</span>
            </div>
            {selectedProductForAdjustment && selectedProductForAdjustment.stock <= selectedProductForAdjustment.min_stock && (
              <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 px-2.5 py-1 rounded-full font-bold text-[10px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                Stock Crítico
              </span>
            )}
          </div>

          <Select
            label="Tipo de Movimiento"
            value={adjType}
            onChange={(e: any) => setAdjType(e.target.value)}
            options={[
              { label: 'Ingreso (Compra / Carga de Mercadería)', value: 'input' },
              { label: 'Egreso (Uso Interno / Merma / Rotura)', value: 'output' },
              { label: 'Ajuste Manual (Corrección de Conteo)', value: 'adjustment' }
            ]}
          />

          {adjType === 'adjustment' && (
            <div className="grid grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-900/40 p-1 rounded-lg border border-border-custom">
              <button
                type="button"
                onClick={() => setAdjDirection('add')}
                className={`py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  adjDirection === 'add'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Sumar stock (+)
              </button>
              <button
                type="button"
                onClick={() => setAdjDirection('subtract')}
                className={`py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  adjDirection === 'subtract'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Restar stock (-)
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Cantidad de Unidades"
              type="number"
              min="1"
              required
              value={adjQuantity}
              onChange={(e) => setAdjQuantity(e.target.value)}
            />

            <div className="flex flex-col justify-end text-xs pb-1 text-zinc-500">
              {adjType === 'input' && (
                <span>Nuevo Stock Esperado: <span className="font-bold text-zinc-800 dark:text-zinc-200">{Number(selectedProductForAdjustment?.stock || 0) + (Number(adjQuantity) || 0)} unidades</span></span>
              )}
              {adjType === 'output' && (
                <span>Nuevo Stock Esperado: <span className="font-bold text-zinc-800 dark:text-zinc-200">{Math.max(0, Number(selectedProductForAdjustment?.stock || 0) - (Number(adjQuantity) || 0))} unidades</span></span>
              )}
              {adjType === 'adjustment' && (
                <span>
                  Nuevo Stock Esperado: <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {adjDirection === 'add' 
                      ? Number(selectedProductForAdjustment?.stock || 0) + (Number(adjQuantity) || 0)
                      : Math.max(0, Number(selectedProductForAdjustment?.stock || 0) - (Number(adjQuantity) || 0))
                    } unidades
                  </span>
                </span>
              )}
            </div>
          </div>

          <Input
            label="Motivo del Ajuste"
            type="text"
            required
            placeholder="Ej: Reposición mensual / Rotura de frasco / Conteo inventario..."
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button variant="ghost" type="button" onClick={() => setIsAdjustmentModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={submittingAdjustment}>
              {submittingAdjustment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Ajustando...</span>
                </>
              ) : (
                'Registrar Ajuste'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
