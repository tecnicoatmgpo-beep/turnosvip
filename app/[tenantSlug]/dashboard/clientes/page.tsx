'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Eye, 
  Smile, 
  Phone, 
  Mail, 
  Calendar, 
  Heart, 
  ShoppingBag, 
  Scissors, 
  Clock, 
  User, 
  Check, 
  XCircle,
  RefreshCw,
  Sparkles,
  ChevronRight
} from 'lucide-react'

interface Customer {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  birthday: string | null
  category: 'nuevo' | 'regular' | 'frecuente' | 'vip'
  discount_percent: number
  notes: string | null
  address: string | null
  locality: string | null
  province: string | null
  tenant_id: string
}

interface Sale {
  id: string
  product_name: string
  quantity: number
  price: number
  purchase_date: string
}

interface Appointment {
  id: string
  appointment_time: string
  status: string
  total_price: number
  services?: {
    name: string
  } | null
  users?: {
    email: string
  } | null
}

const CATEGORY_LABELS = {
  nuevo: 'Nuevo (10% desc.)',
  regular: 'Regular (0% desc.)',
  frecuente: 'Frecuente (5% desc.)',
  vip: 'VIP (15% desc.)'
}

const CATEGORY_BADGES = {
  nuevo: 'bg-indigo-50 text-indigo-700 border-indigo-150 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50',
  regular: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-350 dark:border-zinc-700',
  frecuente: 'bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50',
  vip: 'bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 animate-pulse-slow'
}

const LOCALIDADES_LA_PAMPA = [
  { label: 'Santa Rosa', value: 'Santa Rosa' },
  { label: 'General Pico', value: 'General Pico' },
  { label: 'Toay', value: 'Toay' },
  { label: 'Realicó', value: 'Realicó' },
  { label: 'Eduardo Castex', value: 'Eduardo Castex' },
  { label: '25 de Mayo', value: '25 de Mayo' },
  { label: 'Intendente Alvear', value: 'Intendente Alvear' },
  { label: 'Victorica', value: 'Victorica' },
  { label: 'Guatraché', value: 'Guatraché' },
  { label: 'Macachín', value: 'Macachín' },
  { label: 'Catriló', value: 'Catriló' },
  { label: 'General Acha', value: 'General Acha' },
  { label: 'Quemú Quemú', value: 'Quemú Quemú' },
  { label: 'Ingeniero Luiggi', value: 'Ingeniero Luiggi' },
  { label: 'Colonia Barón', value: 'Colonia Barón' },
  { label: 'General San Martín', value: 'General San Martín' },
  { label: 'Alpachiri', value: 'Alpachiri' },
  { label: 'Winifreda', value: 'Winifreda' },
  { label: 'Trenel', value: 'Trenel' },
  { label: 'Rancul', value: 'Rancul' },
  { label: 'Jacinto Arauz', value: 'Jacinto Arauz' },
  { label: 'Santa Isabel', value: 'Santa Isabel' },
  { label: 'Lonquimay', value: 'Lonquimay' },
  { label: 'Anguil', value: 'Anguil' },
  { label: 'Miguel Riglos', value: 'Miguel Riglos' },
  { label: 'Doblas', value: 'Doblas' },
  { label: 'Bernasconi', value: 'Bernasconi' },
  { label: 'Caleufú', value: 'Caleufú' },
  { label: 'La Adela', value: 'La Adela' },
  { label: 'Otra (Fuera de La Pampa)', value: 'Otra' }
]

const DEFAULT_DISCOUNTS = {
  regular: '0',
  nuevo: '10',
  frecuente: '5',
  vip: '15'
}

export default function ClientesPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  // State
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  
  // Data Lists
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  // Modals
  const [isCRUDModalOpen, setIsCRUDModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  // Detailed History States (loaded when opening Ficha)
  const [historyTab, setHistoryTab] = useState<'services' | 'purchases'>('services')
  const [customerServices, setCustomerServices] = useState<Appointment[]>([])
  const [customerPurchases, setCustomerPurchases] = useState<Sale[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Forms
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    birthday: '',
    category: 'regular' as Customer['category'],
    discount_percent: '0',
    notes: '',
    address: '',
    locality: 'Santa Rosa',
    province: 'La Pampa'
  })

  // Product Sale Form (rendered in History tab)
  const [isAddingSale, setIsAddingSale] = useState(false)
  const [saleFormData, setSaleFormData] = useState({
    product_name: '',
    quantity: '1',
    price: ''
  })
  const [saleErrorMsg, setSaleErrorMsg] = useState('')

  const supabase = createClient()

  const showNotification = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(msg)
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(''), 4000)
    }
  }

  // Fetch all customers
  const fetchCustomers = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      // 1. Get Tenant ID
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single()

      if (!tenant) throw new Error('Comercio no encontrado')
      setTenantId(tenant.id)

      // 2. Fetch Customers
      const { data: customersData, error: customersErr } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('first_name')

      if (customersErr) throw customersErr
      setCustomers(customersData || [])
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error al obtener listado de clientes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tenantSlug) {
      fetchCustomers()
    }
  }, [tenantSlug])

  // Fetch detailed history for selected customer
  const fetchCustomerHistory = async (customerId: string) => {
    setLoadingHistory(true)
    try {
      // Fetch Appointments (Services History)
      const { data: apptsData } = await supabase
        .from('appointments')
        .select('id, appointment_time, status, total_price, services(name), users(email)')
        .eq('customer_id', customerId)
        .order('appointment_time', { ascending: false })

      const formattedAppts = (apptsData || []).map((item: any) => ({
        id: item.id,
        appointment_time: item.appointment_time,
        status: item.status,
        total_price: item.total_price,
        services: Array.isArray(item.services) ? item.services[0] : item.services,
        users: Array.isArray(item.users) ? item.users[0] : item.users
      })) as Appointment[]
      setCustomerServices(formattedAppts)

      // Fetch Product Sales (Purchases History)
      const { data: salesData } = await supabase
        .from('sales')
        .select('id, product_name, quantity, price, purchase_date')
        .eq('customer_id', customerId)
        .order('purchase_date', { ascending: false })

      setCustomerPurchases(salesData || [])
    } catch (err) {
      console.error('Error fetching customer history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Open Ficha / History Modal
  const handleOpenFicha = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setHistoryTab('services')
    setIsAddingSale(false)
    setSaleFormData({ product_name: '', quantity: '1', price: '' })
    setSaleErrorMsg('')
    setIsFichaModalOpen(true)
    await fetchCustomerHistory(customer.id)
  }

  // Open Create Customer Modal
  const handleOpenCreateModal = () => {
    setEditingCustomer(null)
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      birthday: '',
      category: 'regular',
      discount_percent: '0',
      notes: '',
      address: '',
      locality: 'Santa Rosa',
      province: 'La Pampa'
    })
    setErrorMsg('')
    setIsCRUDModalOpen(true)
  }

  // Open Edit Customer Modal
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer)
    
    // Strip +549 prefix from phone number if present for the UI input
    let displayPhone = customer.phone || ''
    if (displayPhone.startsWith('+549')) {
      displayPhone = displayPhone.slice(4)
    } else if (displayPhone.startsWith('549')) {
      displayPhone = displayPhone.slice(3)
    }

    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: displayPhone,
      email: customer.email || '',
      birthday: customer.birthday || '',
      category: customer.category,
      discount_percent: (customer.discount_percent ?? 0).toString(),
      notes: customer.notes || '',
      address: customer.address || '',
      locality: customer.locality || 'Santa Rosa',
      province: customer.province || 'La Pampa'
    })
    setErrorMsg('')
    setIsCRUDModalOpen(true)
  }

  // Delete Customer
  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente? Se borrarán sus datos y su historial de compras de productos.')) return
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      if (error) throw error

      showNotification('Cliente eliminado con éxito', 'success')
      setCustomers(prev => prev.filter(c => c.id !== customerId))
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar cliente', 'error')
    }
  }

  // Save Customer (Create / Edit)
  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId) return
    setErrorMsg('')

    // Format phone with +549 prefix
    let cleanPhone = formData.phone.trim().replace(/\D/g, '') // Keep only digits
    if (cleanPhone.startsWith('549')) {
      cleanPhone = cleanPhone.slice(3)
    }
    const finalPhone = `+549${cleanPhone}`

    const payload = {
      tenant_id: tenantId,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      phone: finalPhone,
      email: formData.email.trim() || null,
      birthday: formData.birthday || null,
      category: formData.category,
      discount_percent: parseFloat(formData.discount_percent) || 0.00,
      notes: formData.notes.trim() || null,
      address: formData.address.trim() || null,
      locality: formData.locality.trim() || null,
      province: formData.province.trim() || null
    }

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingCustomer.id)

        if (error) throw error
        showNotification('Ficha de cliente actualizada con éxito', 'success')
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([payload])

        if (error) throw error
        showNotification('Cliente registrado con éxito', 'success')
      }
      setIsCRUDModalOpen(false)
      fetchCustomers()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el perfil del cliente.')
    }
  }

  // Add Product Sale to Customer
  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer || !tenantId) return
    setSaleErrorMsg('')

    const payload = {
      tenant_id: tenantId,
      customer_id: selectedCustomer.id,
      product_name: saleFormData.product_name.trim(),
      quantity: parseInt(saleFormData.quantity, 10) || 1,
      price: parseFloat(saleFormData.price) || 0
    }

    if (!payload.product_name) {
      setSaleErrorMsg('El nombre del producto es requerido.')
      return
    }

    try {
      const { error } = await supabase
        .from('sales')
        .insert([payload])

      if (error) throw error

      setIsAddingSale(false)
      setSaleFormData({ product_name: '', quantity: '1', price: '' })
      showNotification('Venta de producto registrada con éxito', 'success')
      
      // Refresh histories
      fetchCustomerHistory(selectedCustomer.id)
    } catch (err: any) {
      setSaleErrorMsg(err.message || 'Error al guardar la venta.')
    }
  }

  // Filter list
  const filteredCustomers = customers.filter(c => {
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
    const matchesSearch = 
      fullName.includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = filterCategory === 'all' || c.category === filterCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Fichas de Clientes</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Administra los perfiles de tus clientes, notas de cuidados especiales (tipo de piel/alergias) y sus historiales de servicios y compras.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="shrink-0 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Registrar Cliente
        </Button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs flex items-center gap-2 dark:bg-emerald-950/20 dark:border-emerald-950/30 dark:text-emerald-400">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-center gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Toolbar / Search Filters */}
      <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, email..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-900/50 border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-accent dark:text-zinc-50 placeholder-zinc-400 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="text-zinc-400 dark:text-zinc-505 text-[10px] uppercase font-bold tracking-wider shrink-0">Categoría</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full p-2 text-xs bg-zinc-50 border border-border-custom rounded-lg text-zinc-850 dark:bg-zinc-900/50 dark:text-zinc-100 dark:border-border-custom cursor-pointer"
          >
            <option value="all">Todas</option>
            <option value="nuevo">Nuevo</option>
            <option value="regular">Regular</option>
            <option value="frecuente">Frecuente</option>
            <option value="vip">VIP</option>
          </select>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchCustomers}
          className="flex items-center gap-2 text-xs cursor-pointer ml-auto shrink-0 py-2.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refrescar Lista
        </Button>
      </div>

      {/* Main Customers List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-white dark:bg-card-custom border border-border-custom rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-16 text-center">
          <Smile className="w-12 h-12 text-primary/40 mx-auto mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">No se encontraron clientes</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Registra los perfiles de tus clientes habituales para llevar su historial.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-zinc-50/50 dark:bg-primary-light/10 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Cumpleaños</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-sm">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-primary-light/20 dark:hover:bg-primary-light/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-light text-primary dark:bg-primary-light/25 dark:text-primary-hover flex items-center justify-center font-bold text-sm">
                          {((customer.first_name?.[0] || '') + (customer.last_name?.[0] || '')).toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">{customer.first_name} {customer.last_name}</div>
                          {customer.notes && (
                            <div className="text-xs text-rose-600 dark:text-rose-455 font-medium flex items-center gap-1 mt-0.5 max-w-[200px] truncate">
                              <Heart className="w-3 h-3 fill-rose-600 dark:fill-rose-455" />
                              Tiene notas de cuidado
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-700 dark:text-zinc-300 font-semibold">{customer.phone}</div>
                      {customer.email && <div className="text-xs text-zinc-400 dark:text-zinc-505">{customer.email}</div>}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      {customer.birthday ? new Date(customer.birthday + 'T00:00:00').toLocaleDateString('es-AR', {
                        day: 'numeric', month: 'long'
                      }) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5 items-start">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${CATEGORY_BADGES[customer.category]}`}>
                          {customer.category.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-505 font-medium ml-1 font-semibold">
                          Desc: {customer.discount_percent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenFicha(customer)}
                        className="border-primary text-primary hover:bg-primary-light/50 transition-all duration-150 cursor-pointer"
                        title="Ver Historial y Ficha"
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Historial
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(customer)}
                        className="hover:border-primary hover:text-primary transition-all duration-150 cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="border-rose-200 text-rose-600 dark:border-rose-900/40 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Customer Modal */}
      <Modal
        isOpen={isCRUDModalOpen}
        onClose={() => setIsCRUDModalOpen(false)}
        title={editingCustomer ? 'Editar Ficha de Cliente' : 'Registrar Nuevo Cliente'}
      >
        <form onSubmit={handleSubmitCustomer} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              placeholder="Ej. María"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
            <Input
              label="Apellido"
              placeholder="Ej. González"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-550 mb-1 dark:text-zinc-400 uppercase tracking-wide">
                Teléfono / Celular
              </label>
              <div className="flex rounded-lg overflow-hidden border border-border-custom bg-white dark:bg-card-custom transition-all focus-within:ring-2 focus-within:ring-primary-accent">
                <span className="inline-flex items-center px-3 bg-zinc-50 dark:bg-zinc-900 border-r border-border-custom text-zinc-505 text-sm font-semibold select-none">
                  +54 9
                </span>
                <input
                  type="text"
                  placeholder="Ej. 11 9876 5432"
                  required
                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-transparent border-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="Ej. maria@correo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={formData.birthday}
              onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
            />
            <Select
              label="Categoría de Cliente"
              options={[
                { label: 'Regular (Sin descuento)', value: 'regular' },
                { label: 'Nuevo (10% desc. predeterminado)', value: 'nuevo' },
                { label: 'Frecuente (5% desc. predeterminado)', value: 'frecuente' },
                { label: 'VIP (15% desc. predeterminado)', value: 'vip' }
              ]}
              value={formData.category}
              onChange={(e) => {
                const cat = e.target.value as Customer['category']
                setFormData(prev => ({
                  ...prev,
                  category: cat,
                  discount_percent: DEFAULT_DISCOUNTS[cat]
                }))
              }}
            />
            <Input
              label="Descuento (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              required
              value={formData.discount_percent}
              onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Dirección"
              placeholder="Ej. Av. San Martín 123"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <Select
              label="Localidad"
              options={LOCALIDADES_LA_PAMPA}
              value={formData.locality}
              onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
            />
            <Input
              label="Provincia"
              placeholder="Ej. La Pampa"
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1 dark:text-zinc-400 uppercase tracking-wide">
              Notas de Cuidados Especiales y Tipo de Piel
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm bg-white dark:bg-card-custom border border-border-custom rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-accent min-h-[90px]"
              placeholder="Ej. Alérgica a fragancias. Piel sensible con rosácea. Parámetros de depilación láser recomendados: Cabezal a 14J."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button type="button" variant="outline" onClick={() => setIsCRUDModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer Ficha / History Details Modal */}
      <Modal
        isOpen={isFichaModalOpen}
        onClose={() => setIsFichaModalOpen(false)}
        title="Ficha Integral y Historial"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-start justify-between border-b border-border-custom pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                  {((selectedCustomer.first_name?.[0] || '') + (selectedCustomer.last_name?.[0] || '')).toUpperCase() || 'C'}
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">{selectedCustomer.first_name} {selectedCustomer.last_name}</h4>
                  <div className="text-xs text-zinc-505 dark:text-zinc-400 flex flex-wrap items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      {selectedCustomer.phone}
                    </span>
                    {selectedCustomer.birthday && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        {new Date(selectedCustomer.birthday + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                      </span>
                    )}
                    {(selectedCustomer.address || selectedCustomer.locality || selectedCustomer.province) && (
                      <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded text-[10px] border border-border-custom/50">
                        📍 {[selectedCustomer.address, selectedCustomer.locality, selectedCustomer.province].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${CATEGORY_BADGES[selectedCustomer.category]}`}>
                  {selectedCustomer.category.toUpperCase()}
                </span>
                <span className="text-[10px] font-bold text-primary dark:text-primary-hover bg-primary-light/50 dark:bg-primary-light/10 px-2 py-0.5 rounded-md">
                  Desc. Especial: {selectedCustomer.discount_percent}%
                </span>
              </div>
            </div>

            {/* Care alerts / Aesthetics notes */}
            <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/35 p-4 rounded-xl space-y-1.5">
              <h5 className="text-xs font-bold text-rose-800 dark:text-rose-455 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-600 fill-rose-600 dark:text-rose-455 dark:fill-rose-455 shrink-0" />
                Notas de Cuidado y Alergias (Ficha de Estética)
              </h5>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 italic leading-relaxed whitespace-pre-line">
                {selectedCustomer.notes || 'Ninguna nota especial cargada.'}
              </p>
            </div>

            {/* Tabs selector */}
            <div className="flex border-b border-border-custom p-0.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
              <button
                onClick={() => setHistoryTab('services')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  historyTab === 'services'
                    ? 'bg-white dark:bg-card-custom text-primary shadow-xs font-bold'
                    : 'text-zinc-550 dark:text-zinc-450 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                Historial de Servicios
              </button>
              <button
                onClick={() => setHistoryTab('purchases')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  historyTab === 'purchases'
                    ? 'bg-white dark:bg-card-custom text-primary shadow-xs font-bold'
                    : 'text-zinc-550 dark:text-zinc-450 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Historial de Compras (Productos)
              </button>
            </div>

            {/* Tab content */}
            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-zinc-400 animate-pulse">Cargando historiales...</div>
            ) : (
              <>
                {/* Services history tab */}
                {historyTab === 'services' && (
                  <div className="space-y-4">
                    {customerServices.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-450 italic border border-dashed border-border-custom rounded-xl">
                        Aún no se registran turnos o servicios para este cliente.
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto border border-border-custom rounded-xl overflow-hidden divide-y divide-border-custom">
                        {customerServices.map((appt) => (
                          <div key={appt.id} className="p-3 flex items-center justify-between text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                            <div>
                              <p className="font-bold text-zinc-800 dark:text-zinc-150">
                                {appt.services?.name || 'Servicio Personalizado'}
                              </p>
                              <p className="text-[10px] text-zinc-450 dark:text-zinc-505 flex items-center gap-2 mt-0.5">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                {new Date(appt.appointment_time).toLocaleString('es-AR', {
                                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                                {appt.users?.email && `• Con: ${appt.users.email.split('@')[0]}`}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <span className="font-extrabold text-zinc-900 dark:text-zinc-100">
                                ${Number(appt.total_price).toLocaleString('es-AR')}
                              </span>
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${
                                appt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                appt.status === 'completed' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400' :
                                appt.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400' :
                                'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                              }`}>
                                {appt.status === 'confirmed' && 'Confirmado'}
                                {appt.status === 'pending' && 'Pendiente'}
                                {appt.status === 'canceled' && 'Cancelado'}
                                {appt.status === 'completed' && 'Completado'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Product purchases history tab */}
                {historyTab === 'purchases' && (
                  <div className="space-y-4">
                    {/* Add purchase button toggler */}
                    {!isAddingSale ? (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsAddingSale(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Registrar Venta de Producto
                      </Button>
                    ) : (
                      <form onSubmit={handleSubmitSale} className="p-4 bg-zinc-55/30 border border-border-custom rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-border-custom/50 pb-2">
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">Nueva Compra de Producto</span>
                          <button type="button" onClick={() => setIsAddingSale(false)} className="text-zinc-400 hover:text-zinc-650 cursor-pointer">
                            <ShoppingBag className="w-4 h-4" />
                          </button>
                        </div>

                        {saleErrorMsg && (
                          <p className="text-[10px] text-rose-550 font-bold">{saleErrorMsg}</p>
                        )}

                        <Input
                          label="Nombre del Producto"
                          placeholder="Ej. Shampoo Keratina 250ml"
                          required
                          value={saleFormData.product_name}
                          onChange={(e) => setSaleFormData({ ...saleFormData, product_name: e.target.value })}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Cantidad"
                            type="number"
                            required
                            min="1"
                            value={saleFormData.quantity}
                            onChange={(e) => setSaleFormData({ ...saleFormData, quantity: e.target.value })}
                          />
                          <Input
                            label="Precio Unitario"
                            type="number"
                            step="0.01"
                            required
                            placeholder="Ej. 1200"
                            value={saleFormData.price}
                            onChange={(e) => setSaleFormData({ ...saleFormData, price: e.target.value })}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingSale(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" size="sm">
                            Guardar Compra
                          </Button>
                        </div>
                      </form>
                    )}

                    {customerPurchases.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-450 italic border border-dashed border-border-custom rounded-xl">
                        Aún no se registran compras de productos para este cliente.
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto border border-border-custom rounded-xl overflow-hidden divide-y divide-border-custom">
                        {customerPurchases.map((sale) => (
                          <div key={sale.id} className="p-3 flex items-center justify-between text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                            <div>
                              <p className="font-bold text-zinc-850 dark:text-zinc-150">
                                {sale.product_name}
                              </p>
                              <p className="text-[10px] text-zinc-450 dark:text-zinc-505 flex items-center gap-2 mt-0.5">
                                <Calendar className="w-3 h-3 text-zinc-400" />
                                {new Date(sale.purchase_date).toLocaleDateString('es-AR')}
                                <span>• {sale.quantity} {sale.quantity === 1 ? 'unidad' : 'unidades'} x ${Number(sale.price).toLocaleString('es-AR')}</span>
                              </p>
                            </div>
                            <span className="font-extrabold text-zinc-900 dark:text-zinc-50 text-sm">
                              ${(Number(sale.price) * sale.quantity).toLocaleString('es-AR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Footer close */}
            <div className="flex justify-end border-t border-border-custom pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFichaModalOpen(false)}>
                Cerrar Ficha
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
