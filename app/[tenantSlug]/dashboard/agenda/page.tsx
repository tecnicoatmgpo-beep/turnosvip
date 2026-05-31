'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Scissors,
  Check,
  X,
  Filter,
  Sparkles,
  Heart,
  Printer
} from 'lucide-react'

interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number
}

interface StaffMember {
  id: string
  email: string
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  birthday?: string | null
  category: 'nuevo' | 'regular' | 'frecuente' | 'vip'
  discount_percent: number
  notes: string | null
}

interface Appointment {
  id: string
  tenant_id: string
  client_name: string
  client_phone: string | null
  client_email: string | null
  staff_id: string | null
  service_id: string | null
  appointment_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'canceled'
  total_price: number
  notes: string | null
  services?: {
    name: string
    duration_minutes: number
  } | null
  users?: {
    email: string
  } | null
  customer_id?: string | null
  product_id?: string | null
  product_qty?: number
  products?: {
    id: string
    name: string
    sale_price: number
    stock: number
  } | null
}

type ViewMode = 'day' | 'week' | 'list'


export default function AgendaPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  // State
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>('')
  
  // Data
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [hasProductSupport, setHasProductSupport] = useState<boolean>(false)
  const [maxAppointmentsLimit, setMaxAppointmentsLimit] = useState<number | null>(null)
  const [currentMonthAppointmentsCount, setCurrentMonthAppointmentsCount] = useState<number>(0)

  // Views & Filtering
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStaff, setFilterStaff] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  // Checkout POS State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [checkoutAppointment, setCheckoutAppointment] = useState<Appointment | null>(null)
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'mercadopago'>('efectivo')
  const [isCajaOpen, setIsCajaOpen] = useState<boolean>(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  // Post Checkout Ticket modal
  const [isPostCheckoutTicketOpen, setIsPostCheckoutTicketOpen] = useState(false)
  const [postCheckoutTx, setPostCheckoutTx] = useState<any>(null)
  const [postCheckoutDetails, setPostCheckoutDetails] = useState<any>(null)

  // Form State
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    service_id: '',
    staff_id: '',
    appointment_time: '',
    total_price: '0.00',
    notes: '',
    status: 'confirmed' as Appointment['status'],
    customer_id: '',
    payment_method: 'efectivo' as 'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'mercadopago',
    product_id: '',
    product_qty: '1'
  })

  const supabase = createClient()

  // Load all initial data
  const loadData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      // 1. Get Tenant ID and subscription limits from Slug
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .select(`
          id,
          plan_id,
          subscription_plans (
            max_appointments_per_month
          )
        `)
        .eq('slug', tenantSlug)
        .single()

      if (tenantErr || !tenant) throw new Error('Comercio no encontrado')
      setTenantId(tenant.id)
      const limit = (tenant.subscription_plans as any)?.max_appointments_per_month
      setMaxAppointmentsLimit(limit !== undefined ? limit : null)

      // Count appointments for current month
      let monthlyCount = 0
      if (limit !== undefined && limit !== null) {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

        const { count, error: countErr } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth)

        if (!countErr && count !== null) {
          monthlyCount = count
        }
      }
      setCurrentMonthAppointmentsCount(monthlyCount)

      // 2. Fetch Services
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('tenant_id', tenant.id)
        .order('name')

      setServices(servicesData || [])

      // 3. Fetch Staff
      const { data: staffData } = await supabase
        .from('users')
        .select('id, email')
        .eq('tenant_id', tenant.id)
        .in('role', ['tenant_admin', 'staff'])
        .order('email')

      setStaff(staffData || [])

      // 4. Fetch Active Products Catalog
      let fetchedProducts: any[] = []
      try {
        const { data: productsData, error: prodErr } = await supabase
          .from('products')
          .select('id, name, sale_price, stock')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('name')
        if (!prodErr && productsData) {
          fetchedProducts = productsData
        }
      } catch (err) {
        console.warn('Failed to load products:', err)
      }
      setProducts(fetchedProducts)

      // 5. Fetch Appointments with product details if supported
      let appointmentsRaw: any[] = []
      let supportsProduct = false

      try {
        const { data: apptsWithProd, error: prodRelErr } = await supabase
          .from('appointments')
          .select('*, services(name, duration_minutes), users(email), products(id, name, sale_price, stock)')
          .eq('tenant_id', tenant.id)
          .order('appointment_time', { ascending: true })

        if (prodRelErr) {
          if (prodRelErr.message.includes('product_id') || prodRelErr.message.includes('does not exist')) {
            const { data: apptsNoProd, error: noProdErr } = await supabase
              .from('appointments')
              .select('*, services(name, duration_minutes), users(email)')
              .eq('tenant_id', tenant.id)
              .order('appointment_time', { ascending: true })
            
            if (noProdErr) throw noProdErr
            appointmentsRaw = apptsNoProd || []
          } else {
            throw prodRelErr
          }
        } else {
          appointmentsRaw = apptsWithProd || []
          supportsProduct = true
        }
      } catch (err: any) {
        console.error('Error fetching appointments:', err.message)
        throw err
      }
      setHasProductSupport(supportsProduct)
      
      const formattedAppts = (appointmentsRaw || []).map((item: any) => ({
        ...item,
        services: Array.isArray(item.services) ? item.services[0] : item.services,
        users: Array.isArray(item.users) ? item.users[0] : item.users,
        products: Array.isArray(item.products) ? item.products[0] : item.products
      })) as Appointment[]
      
      setAppointments(formattedAppts)

      // 5. Fetch Customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email, category, notes, discount_percent')
        .eq('tenant_id', tenant.id)
        .order('first_name')

      setCustomers(customersData || [])

      // 6. Fetch User Role & Profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role, first_name, last_name')
          .eq('id', user.id)
          .single()
        if (profile) {
          setUserRole(profile.role)
          setCurrentUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email?.split('@')[0] || '')
        }
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error al cargar los datos de la agenda.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tenantSlug) {
      loadData()
    }
  }, [tenantSlug])

  // Helpers
  const formatForDateTimeInput = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const pad = (num: number) => num.toString().padStart(2, '0')
    // Format to YYYY-MM-DDTHH:mm local time
    const yyyy = date.getFullYear()
    const mm = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    const hh = pad(date.getHours())
    const min = pad(date.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }

  const showNotification = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(msg)
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(''), 4000)
    }
  }

  // Handle service change to pre-fill standard price, applying custom discount if customer is selected
  const handleServiceChange = (serviceId: string, currentCustomerId?: string) => {
    const selectedService = services.find(s => s.id === serviceId)
    const basePrice = selectedService ? selectedService.price : 0
    
    const targetCustomerId = currentCustomerId !== undefined ? currentCustomerId : formData.customer_id
    const selectedCustomer = customers.find(c => c.id === targetCustomerId)
    
    let finalPrice = basePrice
    if (selectedCustomer) {
      const discountPercent = (selectedCustomer.discount_percent ?? 0) / 100
      finalPrice = basePrice * (1 - discountPercent)
    }
    
    setFormData(prev => ({
      ...prev,
      service_id: serviceId,
      total_price: finalPrice.toFixed(2)
    }))
  }

  // Handle customer selection to auto-fill details and apply discount
  const handleCustomerChange = (customerId: string) => {
    const selectedCustomer = customers.find(c => c.id === customerId)
    const selectedService = services.find(s => s.id === formData.service_id)
    const basePrice = selectedService ? selectedService.price : 0
    
    if (selectedCustomer) {
      const discountPercent = (selectedCustomer.discount_percent ?? 0) / 100
      const finalPrice = basePrice * (1 - discountPercent)
      
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        client_name: `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim(),
        client_phone: selectedCustomer.phone || '',
        client_email: selectedCustomer.email || '',
        total_price: finalPrice.toFixed(2)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        customer_id: '',
        client_name: '',
        client_phone: '',
        client_email: '',
        total_price: basePrice.toFixed(2)
      }))
    }
  }

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (maxAppointmentsLimit !== null && currentMonthAppointmentsCount >= maxAppointmentsLimit) {
      alert(`Límite de turnos mensuales alcanzado. Tu plan actual permite un máximo de ${maxAppointmentsLimit} turnos al mes. Actualiza tu plan para agendar más turnos.`)
      return
    }
    setEditingAppointment(null)
    setFormData({
      client_name: '',
      client_phone: '',
      client_email: '',
      service_id: services[0]?.id || '',
      staff_id: staff[0]?.id || '',
      appointment_time: formatForDateTimeInput(new Date().toISOString()),
      total_price: services[0]?.price.toString() || '0.00',
      notes: '',
      status: 'confirmed',
      customer_id: '',
      payment_method: 'efectivo',
      product_id: '',
      product_qty: '1'
    })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = async (appt: Appointment) => {
    setEditingAppointment(appt)
    
    // Fetch payment method if already completed
    let paymentMethod: any = 'efectivo'
    if (appt.status === 'completed') {
      const { data: tx } = await supabase
        .from('cash_transactions')
        .select('payment_method')
        .eq('reference_id', appt.id)
        .maybeSingle()
      if (tx) {
        paymentMethod = tx.payment_method
      }
    }

    setFormData({
      client_name: appt.client_name,
      client_phone: appt.client_phone || '',
      client_email: appt.client_email || '',
      service_id: appt.service_id || '',
      staff_id: appt.staff_id || '',
      appointment_time: formatForDateTimeInput(appt.appointment_time),
      total_price: appt.total_price.toString(),
      notes: appt.notes || '',
      status: appt.status,
      customer_id: appt.customer_id || '',
      payment_method: paymentMethod,
      product_id: appt.product_id || '',
      product_qty: (appt.product_qty || 1).toString()
    })
    setIsDetailModalOpen(false)
    setIsModalOpen(true)
  }

  // Quick Action to Change Status
  const handleQuickStatusChange = async (appt: Appointment, newStatus: Appointment['status']) => {
    if (newStatus === 'completed') {
      // Intercept and open checkout modal
      setIsDetailModalOpen(false)
      setCheckoutAppointment(appt)
      setCheckoutPaymentMethod('efectivo')
      setCheckoutError('')
      setCheckoutLoading(false)
      setIsCheckoutModalOpen(true)

      try {
        const res = await fetch('/api/tenant/caja/status')
        const data = await res.json()
        setIsCajaOpen(res.ok && data.isOpen)
      } catch (e) {
        setIsCajaOpen(false)
      }
      return
    }

    try {
      // If we are reverting a completed appointment, delete the associated cash transaction
      if (appt.status === 'completed') {
        const { error: deleteTxErr } = await supabase
          .from('cash_transactions')
          .delete()
          .eq('reference_id', appt.id)
        if (deleteTxErr) throw deleteTxErr
      }

      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', appt.id)

      if (error) throw error
      
      showNotification('Estado actualizado con éxito', 'success')
      setIsDetailModalOpen(false)
      loadData()
    } catch (err: any) {
      showNotification(err.message || 'Error al actualizar el estado', 'error')
    }
  }

  // Delete Appointment
  const handleDeleteAppointment = async (apptId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este turno?')) return
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', apptId)

      if (error) throw error

      showNotification('Turno eliminado correctamente', 'success')
      setIsDetailModalOpen(false)
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar el turno', 'error')
    }
  }

  // Submit form (Save / Insert)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId) return

    const payload: any = {
      tenant_id: tenantId,
      client_name: formData.client_name.trim(),
      client_phone: formData.client_phone.trim() || null,
      client_email: formData.client_email.trim() || null,
      service_id: formData.service_id || null,
      staff_id: formData.staff_id || null,
      appointment_time: new Date(formData.appointment_time).toISOString(),
      total_price: parseFloat(formData.total_price) || 0.00,
      notes: formData.notes.trim() || null,
      status: formData.status,
      customer_id: formData.customer_id || null
    }

    if (hasProductSupport) {
      payload.product_id = formData.product_id || null
      payload.product_qty = formData.product_id ? parseInt(formData.product_qty, 10) : null
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Verify Cash Register is open if setting status to Completed
      let activeRegister: any = null
      if (payload.status === 'completed') {
        const res = await fetch('/api/tenant/caja/status')
        const statusData = await res.json()
        if (!res.ok || !statusData.isOpen) {
          throw new Error('No se puede completar el turno: la caja diaria está cerrada. Por favor, abre la caja en la sección de Caja antes de registrar cobros.')
        }
        activeRegister = statusData.register
      }

      // 2. Validate product stock if a product is linked and we are completing the turn
      const isNewCompletion = payload.status === 'completed' && (!editingAppointment || editingAppointment.status !== 'completed')
      let linkedProduct: any = null
      let prodQty = 1
      if (isNewCompletion && hasProductSupport && formData.product_id) {
        prodQty = parseInt(formData.product_qty, 10)
        const { data: prod } = await supabase
          .from('products')
          .select('id, name, sale_price, stock')
          .eq('id', formData.product_id)
          .single()
        
        if (prod) {
          if (prod.stock < prodQty) {
            throw new Error(`Stock insuficiente para "${prod.name}". Disponible: ${prod.stock}, Solicitado: ${prodQty}`)
          }
          linkedProduct = prod
        }
      }

      let apptId = editingAppointment?.id || ''

      // 3. Revert completed transaction if changing status away from completed
      if (editingAppointment && editingAppointment.status === 'completed' && payload.status !== 'completed') {
        await supabase
          .from('cash_transactions')
          .delete()
          .eq('reference_id', editingAppointment.id)
      }

      // 4. Save Appointment
      if (editingAppointment) {
        const { error } = await supabase
          .from('appointments')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingAppointment.id)

        if (error) throw error
        showNotification('Turno actualizado con éxito', 'success')
      } else {
        // Limit check
        if (maxAppointmentsLimit !== null) {
          const now = new Date()
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

          const { count, error: countErr } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth)

          if (countErr) {
            throw new Error('Error al verificar el límite de turnos mensuales.')
          }

          if ((count || 0) >= maxAppointmentsLimit) {
            throw new Error(`Límite de turnos mensuales alcanzado. Tu plan actual permite un máximo de ${maxAppointmentsLimit} reservas al mes.`)
          }
        }

        const { data: newAppt, error } = await supabase
          .from('appointments')
          .insert([payload])
          .select('id')
          .single()

        if (error) throw error
        apptId = newAppt.id
        showNotification('Turno creado con éxito', 'success')
      }

      // 5. Handle stock updates, movement, and sales if new completion
      if (isNewCompletion && linkedProduct) {
        const newStock = linkedProduct.stock - prodQty
        
        // Update stock
        const { error: stockErr } = await supabase
          .from('products')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', linkedProduct.id)
        if (stockErr) throw stockErr

        // Log movement
        const { error: moveErr } = await supabase
          .from('stock_movements')
          .insert({
            tenant_id: tenantId,
            product_id: linkedProduct.id,
            user_id: user?.id || '',
            type: 'output',
            quantity: prodQty,
            previous_stock: linkedProduct.stock,
            new_stock: newStock,
            reason: `Venta vinculada a turno (Cliente: ${payload.client_name})`
          })
        if (moveErr) console.error('Error logging movement:', moveErr.message)

        // Insert sale
        const { error: saleErr } = await supabase
          .from('sales')
          .insert({
            tenant_id: tenantId,
            customer_id: payload.customer_id || null,
            product_name: linkedProduct.name,
            quantity: prodQty,
            price: linkedProduct.sale_price,
            product_id: linkedProduct.id
          })
        if (saleErr) console.error('Error logging sale:', saleErr.message)
      }

      // 6. Handle Cash Transactions if completed
      if (payload.status === 'completed' && activeRegister) {
        // Delete old transactions to prevent duplicates
        await supabase
          .from('cash_transactions')
          .delete()
          .eq('reference_id', apptId)

        // A. Insert Service Transaction
        const { error: txErr } = await supabase
          .from('cash_transactions')
          .insert({
            tenant_id: tenantId,
            register_id: activeRegister.id,
            user_id: user?.id || '',
            type: 'income',
            amount: payload.total_price,
            payment_method: formData.payment_method,
            category: 'servicio',
            reference_id: apptId,
            notes: `Cobro de turno - Cliente: ${payload.client_name}`
          })
        if (txErr) throw txErr

        // B. Insert Product Transaction (if any)
        let currentLinkedProduct = linkedProduct
        let currentProdQty = prodQty
        if (!currentLinkedProduct && hasProductSupport && formData.product_id) {
          const { data: prod } = await supabase
            .from('products')
            .select('id, name, sale_price')
            .eq('id', formData.product_id)
            .single()
          currentLinkedProduct = prod
          currentProdQty = parseInt(formData.product_qty, 10)
        }

        if (currentLinkedProduct) {
          const productTotal = currentLinkedProduct.sale_price * currentProdQty
          const { error: pTxErr } = await supabase
            .from('cash_transactions')
            .insert({
              tenant_id: tenantId,
              register_id: activeRegister.id,
              user_id: user?.id || '',
              type: 'income',
              amount: productTotal,
              payment_method: formData.payment_method,
              category: 'producto',
              reference_id: apptId,
              notes: `Producto vinculado a turno (${currentLinkedProduct.name} x${currentProdQty}) - Cliente: ${payload.client_name}`
            })
          if (pTxErr) throw pTxErr
        }
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      showNotification(err.message || 'Error al guardar el turno', 'error')
    }
  }

  // Date Nav Helpers
  const shiftDate = (amount: number) => {
    const newDate = new Date(selectedDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + amount)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + amount * 7)
    }
    setSelectedDate(newDate)
  }

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate()
  }

  // Filter Appointments based on parameters
  const getFilteredAppointments = () => {
    return appointments.filter(appt => {
      // 1. Search Query
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        appt.client_name.toLowerCase().includes(query) ||
        (appt.client_phone && appt.client_phone.includes(query)) ||
        (appt.client_email && appt.client_email.toLowerCase().includes(query))

      if (!matchesSearch) return false

      // 2. Staff filter
      if (filterStaff !== 'all' && appt.staff_id !== filterStaff) return false

      // 3. Status filter
      if (filterStatus !== 'all' && appt.status !== filterStatus) return false

      // 4. Date filter (only if not in 'list' view mode)
      if (viewMode === 'day') {
        return isSameDay(new Date(appt.appointment_time), selectedDate)
      }

      if (viewMode === 'week') {
        // Find start of week (Monday) based on selectedDate
        const startOfWeek = new Date(selectedDate)
        const day = startOfWeek.getDay()
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
        startOfWeek.setDate(diff)
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        const apptTime = new Date(appt.appointment_time)
        return apptTime >= startOfWeek && apptTime <= endOfWeek
      }

      return true // list mode
    })
  }

  const filteredAppts = getFilteredAppointments()

  // Generate Week Dates based on selectedDate
  const getWeekDates = () => {
    const dates = []
    const startOfWeek = new Date(selectedDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    startOfWeek.setDate(diff)

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      dates.push(d)
    }
    return dates
  }

  const weekDates = getWeekDates()

  const statusLabels = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    completed: 'Completado',
    canceled: 'Cancelado'
  }

  const statusColors = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50',
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50',
    completed: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50',
    canceled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'
  }

  const limitReached = maxAppointmentsLimit !== null && currentMonthAppointmentsCount >= maxAppointmentsLimit

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Agenda / Turnos</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Visualiza y programa las citas de tus clientes de manera fácil.
          </p>
        </div>
        <Button 
          onClick={handleOpenCreateModal} 
          disabled={limitReached}
          className="shrink-0 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Turno
        </Button>
      </div>

      {/* Success/Error Alerts */}
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

      {limitReached && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-3 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-455">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div>
            <h4 className="font-bold">Límite de Turnos Mensuales Alcanzado</h4>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
              Tu plan actual permite un máximo de {maxAppointmentsLimit} turnos al mes. Se ha deshabilitado la creación de nuevos turnos.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar / Filters */}
      <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-4 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Navigation Controls (Only for day/week view) */}
          {viewMode !== 'list' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDate(-1)}
                className="p-2 border border-border-custom rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-650 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 min-w-[150px] text-center capitalize">
                {viewMode === 'day' 
                  ? selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : `Semana del ${weekDates[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} al ${weekDates[6].toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                }
              </span>
              <button
                onClick={() => shiftDate(1)}
                className="p-2 border border-border-custom rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-650 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="text-xs py-2"
              >
                Hoy
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">Todos los Turnos</span>
            </div>
          )}

          {/* View Mode Selector */}
          <div className="flex bg-zinc-150/50 dark:bg-zinc-900/60 p-1 rounded-lg self-start lg:self-auto">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'day' 
                  ? 'bg-white dark:bg-card-custom text-primary shadow-xs font-bold' 
                  : 'text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Día
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'week' 
                  ? 'bg-white dark:bg-card-custom text-primary shadow-xs font-bold' 
                  : 'text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-card-custom text-primary shadow-xs font-bold' 
                  : 'text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Lista Completa
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border-t border-border-custom/50 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar cliente, teléfono..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-900/50 border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-accent dark:text-zinc-50 placeholder-zinc-400 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider shrink-0">Personal</span>
            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
              className="w-full p-2 text-xs bg-zinc-50 border border-border-custom rounded-lg text-zinc-850 dark:bg-zinc-900/50 dark:text-zinc-100 dark:border-border-custom cursor-pointer"
            >
              <option value="all">Todos</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.email}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider shrink-0">Estado</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 text-xs bg-zinc-50 border border-border-custom rounded-lg text-zinc-850 dark:bg-zinc-900/50 dark:text-zinc-100 dark:border-border-custom cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmados</option>
              <option value="completed">Completados</option>
              <option value="canceled">Cancelados</option>
            </select>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadData}
            className="flex items-center justify-center gap-2 text-xs cursor-pointer py-2 md:col-start-4"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar Agenda
          </Button>
        </div>
      </div>

      {/* Main Agenda Content Grid */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white dark:bg-card-custom border border-border-custom rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Day View */}
          {viewMode === 'day' && (
            <div className="bg-white dark:bg-card-custom border border-border-custom rounded-2xl shadow-xs overflow-hidden">
              {filteredAppts.length === 0 ? (
                <div className="p-16 text-center">
                  <CalendarIcon className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">No hay turnos para este día</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Agenda uno nuevo haciendo clic en "Nuevo Turno".</p>
                </div>
              ) : (
                <div className="divide-y divide-border-custom">
                  {filteredAppts.map((appt) => {
                    const time = new Date(appt.appointment_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                    return (
                      <div 
                        key={appt.id} 
                        onClick={() => { setSelectedAppointment(appt); setIsDetailModalOpen(true); }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-primary-light/10 dark:hover:bg-primary-light/5 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-border-custom rounded-xl flex flex-col items-center justify-center min-w-[70px] shrink-0">
                            <Clock className="w-4 h-4 text-primary mb-1" />
                            <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">{time}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors flex items-center gap-2">
                              {appt.client_name}
                              <span className={`w-2 h-2 rounded-full ${
                                appt.status === 'confirmed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' :
                                appt.status === 'pending' ? 'bg-amber-500' :
                                appt.status === 'completed' ? 'bg-indigo-500' : 'bg-rose-500'
                              }`} />
                            </div>
                            <div className="text-xs text-zinc-505 dark:text-zinc-400 flex flex-wrap items-center gap-3">
                              {appt.client_phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-zinc-400" /> {appt.client_phone}
                                </span>
                              )}
                              {appt.services?.name && (
                                <span className="flex items-center gap-1 font-semibold text-primary dark:text-primary-hover">
                                  <Scissors className="w-3 h-3" /> {appt.services.name} ({appt.services.duration_minutes} min)
                                </span>
                              )}
                              {appt.users?.email && (
                                <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded text-[10px] font-medium border border-border-custom/50">
                                  Con: {appt.users.email.split('@')[0]}
                                </span>
                              )}
                            </div>
                            {appt.notes && (
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-1 italic">
                                "{appt.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-dashed border-border-custom/30 sm:border-t-0">
                          <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                            ${Number(appt.total_price).toLocaleString('es-AR')}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${statusColors[appt.status]}`}>
                            {statusLabels[appt.status]}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Week View */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {weekDates.map((date) => {
                const dayAppts = appointments.filter(a => isSameDay(new Date(a.appointment_time), date))
                const activeDayAppts = dayAppts.filter(a => 
                  searchQuery ? (
                    a.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (a.client_phone && a.client_phone.includes(searchQuery))
                  ) : true
                ).filter(a => {
                  if (filterStaff !== 'all' && a.staff_id !== filterStaff) return false
                  if (filterStatus !== 'all' && a.status !== filterStatus) return false
                  return true
                })

                const isToday = isSameDay(date, new Date())

                return (
                  <div 
                    key={date.toISOString()} 
                    className={`bg-white dark:bg-card-custom border rounded-2xl p-4 flex flex-col min-h-[250px] shadow-2xs transition-all ${
                      isToday 
                        ? 'border-primary ring-2 ring-primary/10 dark:ring-primary/20 bg-primary-light/5' 
                        : 'border-border-custom hover:border-zinc-350 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Week Day Header */}
                    <div className="border-b border-border-custom pb-2.5 mb-3 flex items-center justify-between">
                      <div className="text-left">
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${
                          isToday ? 'text-primary font-extrabold' : 'text-zinc-405 dark:text-zinc-500'
                        }`}>
                          {date.toLocaleDateString('es-AR', { weekday: 'short' })}
                        </span>
                        <div className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50 mt-0.5 leading-none">
                          {date.getDate()}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-primary-light text-primary dark:bg-primary-light/20 dark:text-primary-hover px-2 py-0.5 rounded-full">
                        {activeDayAppts.length} Citas
                      </span>
                    </div>

                    {/* Small list of items inside day column */}
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] scrollbar-thin">
                      {activeDayAppts.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center p-4">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium italic">Sin citas</span>
                        </div>
                      ) : (
                        activeDayAppts.map((appt) => {
                          const time = new Date(appt.appointment_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                          return (
                            <div
                              key={appt.id}
                              onClick={() => { setSelectedAppointment(appt); setIsDetailModalOpen(true); }}
                              className={`p-2 rounded-xl text-left border cursor-pointer hover:-translate-y-0.5 transition-all text-xs space-y-1 ${
                                appt.status === 'confirmed' ? 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-150/70 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 dark:border-emerald-900/40 text-zinc-900 dark:text-zinc-100' :
                                appt.status === 'pending' ? 'bg-amber-50/50 hover:bg-amber-50 border-amber-150/70 dark:bg-amber-950/10 dark:hover:bg-amber-950/20 dark:border-amber-900/40 text-zinc-900 dark:text-zinc-100' :
                                appt.status === 'completed' ? 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-150/70 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20 dark:border-indigo-900/40 text-zinc-900 dark:text-zinc-100' :
                                'bg-rose-50/50 hover:bg-rose-50 border-rose-150/70 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 dark:border-rose-900/40 text-zinc-400 dark:text-zinc-500 line-through'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="truncate max-w-[70px]">{appt.client_name}</span>
                                <span className="font-extrabold shrink-0 text-[10px]">{time}</span>
                              </div>
                              <div className="text-[10px] text-zinc-505 dark:text-zinc-400 font-semibold truncate">
                                {appt.services?.name || 'Servicio'}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* List View (Table) */}
          {viewMode === 'list' && (
            <div className="bg-white dark:bg-card-custom border border-border-custom rounded-2xl shadow-xs overflow-hidden">
              {filteredAppts.length === 0 ? (
                <div className="p-16 text-center">
                  <Search className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">No se encontraron turnos</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Prueba quitando filtros o cambiando la búsqueda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-custom bg-zinc-50/50 dark:bg-primary-light/10 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Fecha y Hora</th>
                        <th className="px-6 py-4">Servicio</th>
                        <th className="px-6 py-4">Personal Asignado</th>
                        <th className="px-6 py-4">Precio Total</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom text-sm">
                      {filteredAppts.map((appt) => (
                        <tr 
                          key={appt.id} 
                          className="hover:bg-primary-light/10 dark:hover:bg-primary-light/5 transition-colors cursor-pointer group"
                          onClick={() => { setSelectedAppointment(appt); setIsDetailModalOpen(true); }}
                        >
                          <td className="px-6 py-4">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100">{appt.client_name}</div>
                            <div className="text-xs text-zinc-450 dark:text-zinc-500">
                              {appt.client_phone || appt.client_email || 'Sin contacto'}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-300">
                            {new Date(appt.appointment_time).toLocaleString('es-AR', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 text-primary dark:text-primary-hover font-semibold">
                            {appt.services?.name || 'Personalizado'}
                          </td>
                          <td className="px-6 py-4 text-zinc-650 dark:text-zinc-400">
                            {appt.users?.email ? appt.users.email.split('@')[0] : 'No asignado'}
                          </td>
                          <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">
                            ${Number(appt.total_price).toLocaleString('es-AR')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[appt.status]}`}>
                              {statusLabels[appt.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditModal(appt)}
                              className="hover:border-primary hover:text-primary"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {(userRole === 'tenant_admin' || userRole === 'superadmin') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteAppointment(appt.id)}
                                className="border-rose-200 text-rose-600 dark:border-rose-900/40 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Appointment Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detalles del Turno"
      >
        {errorMsg && (
          <div className="p-3 mb-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-750 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
            <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {selectedAppointment && (
          <div className="space-y-6">
            {/* Main Info */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{selectedAppointment.client_name}</h4>
                <p className="text-xs text-zinc-505 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  {new Date(selectedAppointment.appointment_time).toLocaleString('es-AR', {
                    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors[selectedAppointment.status]}`}>
                {statusLabels[selectedAppointment.status]}
              </span>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 border border-border-custom rounded-xl text-sm">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-405 dark:text-zinc-500 tracking-wider">Servicio</span>
                <p className="font-semibold text-zinc-900 dark:text-zinc-150 flex items-center gap-1">
                  <Scissors className="w-4 h-4 text-primary shrink-0" />
                  {selectedAppointment.services?.name || 'Personalizado'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-405 dark:text-zinc-500 tracking-wider">Precio Total</span>
                <p className="font-extrabold text-zinc-900 dark:text-zinc-50 text-base">
                  ${Number(selectedAppointment.total_price).toLocaleString('es-AR')}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-405 dark:text-zinc-500 tracking-wider">Profesional</span>
                <p className="font-semibold text-zinc-900 dark:text-zinc-155">
                  {selectedAppointment.users?.email || 'No asignado'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-405 dark:text-zinc-500 tracking-wider">Duración Est.</span>
                <p className="font-semibold text-zinc-900 dark:text-zinc-155">
                  {selectedAppointment.services?.duration_minutes || 30} minutos
                </p>
              </div>
            </div>

            {/* Client contact info */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-405 dark:text-zinc-500">Datos de Contacto</h5>
              <div className="space-y-2 text-sm text-zinc-705 dark:text-zinc-300">
                {selectedAppointment.client_phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{selectedAppointment.client_phone}</span>
                  </p>
                )}
                {selectedAppointment.client_email && (
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{selectedAppointment.client_email}</span>
                  </p>
                )}
                {!selectedAppointment.client_phone && !selectedAppointment.client_email && (
                  <p className="text-xs text-zinc-450 italic">Sin datos de contacto cargados</p>
                )}
              </div>
            </div>

            {/* Notes */}
            {selectedAppointment.notes && (
              <div className="space-y-1.5 border-t border-border-custom/50 pt-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-405 dark:text-zinc-500">Notas / Comentarios</h5>
                <p className="text-sm bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-border-custom text-zinc-700 dark:text-zinc-300 italic">
                  "{selectedAppointment.notes}"
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border-custom">
              {/* Quick Status Adjustments */}
              {selectedAppointment.status !== 'confirmed' && selectedAppointment.status !== 'completed' && (
                <Button 
                  onClick={() => handleQuickStatusChange(selectedAppointment, 'confirmed')} 
                  variant="outline" 
                  size="sm"
                  className="bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 border-emerald-100 hover:border-emerald-250 cursor-pointer"
                >
                  Confirmar
                </Button>
              )}
              {selectedAppointment.status !== 'completed' && (
                <Button 
                  onClick={() => handleQuickStatusChange(selectedAppointment, 'completed')}
                  variant="outline"
                  size="sm"
                  className="bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 border-indigo-100 hover:border-indigo-250 cursor-pointer"
                >
                  Completar
                </Button>
              )}
              {selectedAppointment.status !== 'canceled' && (
                <Button 
                  onClick={() => handleQuickStatusChange(selectedAppointment, 'canceled')}
                  variant="outline"
                  size="sm"
                  className="bg-rose-50/50 hover:bg-rose-55 text-rose-700 border-rose-100 hover:border-rose-250 cursor-pointer"
                >
                  Cancelar
                </Button>
              )}

              <div className="flex-1" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEditModal(selectedAppointment)}
                className="flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar
              </Button>
              {(userRole === 'tenant_admin' || userRole === 'superadmin') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                  className="border-rose-200 text-rose-600 dark:border-rose-900/40 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Appointment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAppointment ? 'Editar Turno' : 'Programar Nuevo Turno'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-750 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-zinc-505 mb-1 dark:text-zinc-400 uppercase tracking-wide">
              Vincular a Cliente Registrado (Opcional)
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent dark:bg-card-custom dark:border-border-custom dark:text-zinc-100 transition-all cursor-pointer"
            >
              <option value="">-- Ingreso manual (Cliente no registrado) --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} ({c.phone}) - {c.category.toUpperCase()} ({c.discount_percent}%)
                </option>
              ))}
            </select>
          </div>

          {formData.customer_id && (
            (() => {
              const selectedCustomer = customers.find(c => c.id === formData.customer_id)
              if (!selectedCustomer) return null
              const discountPercent = selectedCustomer.discount_percent ?? 0
              return (
                <div className="p-3 bg-primary-light/10 dark:bg-primary-light/5 border border-primary/20 rounded-xl space-y-1.5 text-xs text-zinc-705 dark:text-zinc-300">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-primary flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 fill-primary/20" />
                      Cliente {selectedCustomer.category.toUpperCase()} Detectado
                    </span>
                    <span className="bg-primary/20 text-primary dark:bg-primary/30 px-2 py-0.5 rounded-full text-[10px]">
                      {discountPercent}% Descuento Aplicado automáticamente
                    </span>
                  </div>
                  {selectedCustomer.notes && (
                    <div className="text-rose-600 dark:text-rose-455 font-medium flex items-start gap-1">
                      <Heart className="w-3.5 h-3.5 fill-rose-600 dark:fill-rose-455 shrink-0 mt-0.5" />
                      <span><strong>Notas de Cuidado:</strong> {selectedCustomer.notes}</span>
                    </div>
                  )}
                </div>
              )
            })()
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Nombre del Cliente"
              placeholder="Ej. Juan Pérez"
              required
              disabled={!!formData.customer_id}
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            />
            <Input
              label="Teléfono del Cliente"
              placeholder="Ej. +54 9 11 2345 6789"
              disabled={!!formData.customer_id}
              value={formData.client_phone}
              onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
            />
            <Input
              label="Email del Cliente"
              type="email"
              placeholder="Ej. juan@correo.com"
              disabled={!!formData.customer_id}
              value={formData.client_email}
              onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1 dark:text-zinc-400 uppercase tracking-wide">
                Servicio a Realizar
              </label>
              <select
                required
                value={formData.service_id}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent dark:bg-card-custom dark:border-border-custom dark:text-zinc-100 transition-all cursor-pointer"
              >
                <option value="">Selecciona un servicio</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (${Number(s.price).toLocaleString('es-AR')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1 dark:text-zinc-400 uppercase tracking-wide">
                Personal Asignado
              </label>
              <select
                required
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent dark:bg-card-custom dark:border-border-custom dark:text-zinc-100 transition-all cursor-pointer"
              >
                <option value="">Selecciona estilista</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.email.split('@')[0]} ({s.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasProductSupport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1 dark:text-zinc-400 uppercase tracking-wide">
                  Producto Adicional (Opcional)
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => {
                    const prodId = e.target.value
                    setFormData(prev => ({
                      ...prev,
                      product_id: prodId,
                      product_qty: prodId ? prev.product_qty : '1'
                    }))
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-border-custom rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent dark:bg-card-custom dark:border-border-custom dark:text-zinc-100 transition-all cursor-pointer"
                >
                  <option value="">-- Ningún producto --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                      {p.name} (${Number(p.sale_price).toLocaleString('es-AR')}) - Stock: {p.stock} {p.stock <= 0 ? '(Agotado)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Input
                  label="Cantidad Producto"
                  type="number"
                  min="1"
                  disabled={!formData.product_id}
                  value={formData.product_qty}
                  onChange={(e) => setFormData({ ...formData, product_qty: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha y Hora"
              type="datetime-local"
              required
              value={formData.appointment_time}
              onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
            />
            <Input
              label="Precio Final (ARS)"
              type="number"
              step="0.01"
              required
              min="0"
              value={formData.total_price}
              onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
            />
          </div>

          {editingAppointment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Estado del Turno"
                options={[
                  { label: 'Pendiente', value: 'pending' },
                  { label: 'Confirmado', value: 'confirmed' },
                  { label: 'Completado', value: 'completed' },
                  { label: 'Cancelado', value: 'canceled' },
                ]}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Appointment['status'] })}
              />

              {formData.status === 'completed' && (
                <Select
                  label="Método de Pago"
                  options={[
                    { label: 'Efectivo', value: 'efectivo' },
                    { label: 'Transferencia Bancaria', value: 'transferencia' },
                    { label: 'Tarjeta de Débito', value: 'tarjeta_debito' },
                    { label: 'Tarjeta de Crédito', value: 'tarjeta_credito' },
                    { label: 'MercadoPago', value: 'mercadopago' },
                  ]}
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1 dark:text-zinc-400 uppercase tracking-wide">
              Notas / Detalles Especiales
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm bg-white dark:bg-card-custom border border-border-custom rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-accent min-h-[80px]"
              placeholder="Ej. El cliente prefiere corte con tijera. Alérgico a ciertos productos."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingAppointment ? 'Guardar Cambios' : 'Programar Turno'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: COBRAR TURNO (QUICK CHECKOUT) */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Cobrar Turno - Registrar Pago"
        size="md"
      >
        <div className="space-y-5">
          {checkoutError && (
            <div className="p-3 bg-rose-50 border border-rose-250 rounded-lg text-rose-700 text-xs font-semibold">
              {checkoutError}
            </div>
          )}

          {checkoutAppointment && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-border-custom rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Cliente:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-50">{checkoutAppointment.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Servicio:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-50">
                  {checkoutAppointment.services?.name || 'Servicio Contratado'}
                </span>
              </div>
              {checkoutAppointment.products && (
                <div className="flex justify-between text-xs border-t border-border-custom pt-2">
                  <span className="text-zinc-500">Producto Adicional:</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {checkoutAppointment.products.name} (x{checkoutAppointment.product_qty})
                  </span>
                </div>
              )}
              {checkoutAppointment.products && (
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Precio Producto:</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(checkoutAppointment.products.sale_price * (checkoutAppointment.product_qty || 1))}
                  </span>
                </div>
              )}
              <div className="border-t border-border-custom my-2"></div>
              <div className="flex justify-between text-sm font-bold">
                <span>Total a Cobrar:</span>
                <span className="text-primary">
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
                    checkoutAppointment.total_price + 
                    (checkoutAppointment.products ? (checkoutAppointment.products.sale_price * (checkoutAppointment.product_qty || 1)) : 0)
                  )}
                </span>
              </div>
            </div>
          )}

          {!isCajaOpen ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3 text-xs text-rose-800">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">Caja Diaria Cerrada</h4>
                <p className="mt-0.5">
                  No puedes completar el cobro de este turno porque la caja diaria está cerrada. Por favor, ve al módulo de **Caja** y abre la sesión del día antes de continuar.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Selecciona el Método de Pago</label>
              <Select
                value={checkoutPaymentMethod}
                onChange={(e) => setCheckoutPaymentMethod(e.target.value as any)}
                options={[
                  { label: 'Efectivo', value: 'efectivo' },
                  { label: 'Transferencia Bancaria', value: 'transferencia' },
                  { label: 'Tarjeta de Débito', value: 'tarjeta_debito' },
                  { label: 'Tarjeta de Crédito', value: 'tarjeta_credito' },
                  { label: 'MercadoPago', value: 'mercadopago' },
                ]}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCheckoutModalOpen(false)}
              disabled={checkoutLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!checkoutAppointment) return
                setCheckoutLoading(true)
                setCheckoutError('')
                try {
                  const { data: { user } } = await supabase.auth.getUser()
                  
                  // 1. Fetch active session register details
                  const res = await fetch('/api/tenant/caja/status')
                  const statusData = await res.json()
                  if (!res.ok || !statusData.isOpen) {
                    throw new Error('La caja se encuentra cerrada.')
                  }

                  // 2. Handle linked product stock validation and updates
                  let linkedProduct: any = null
                  let prodQty = checkoutAppointment.product_qty || 1
                  if (hasProductSupport && checkoutAppointment.product_id) {
                    const { data: prod, error: prodErr } = await supabase
                      .from('products')
                      .select('id, name, sale_price, stock')
                      .eq('id', checkoutAppointment.product_id)
                      .single()

                    if (prodErr || !prod) {
                      throw new Error('El producto vinculado al turno no existe en el catálogo.')
                    }

                    if (prod.stock < prodQty) {
                      throw new Error(`Stock insuficiente para "${prod.name}". Disponible: ${prod.stock}, Solicitado: ${prodQty}`)
                    }
                    linkedProduct = prod
                  }

                  // Delete old cash transactions if any
                  await supabase
                    .from('cash_transactions')
                    .delete()
                    .eq('reference_id', checkoutAppointment.id)

                  // 3. Register Cash Transaction for Service
                  const txRes = await fetch('/api/tenant/caja/transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'income',
                      amount: checkoutAppointment.total_price,
                      payment_method: checkoutPaymentMethod,
                      category: 'servicio',
                      reference_id: checkoutAppointment.id,
                      notes: `Cobro de turno - Cliente: ${checkoutAppointment.client_name}`
                    })
                  })
                  const txData = await txRes.json()
                  if (!txRes.ok) throw new Error(txData.error)

                  let productAmount = 0
                  // 4. Update product stock and insert sale if product is linked
                  if (linkedProduct) {
                    productAmount = Number(linkedProduct.sale_price) * prodQty
                    const newStock = linkedProduct.stock - prodQty

                    // A. Update Stock
                    const { error: stockErr } = await supabase
                      .from('products')
                      .update({ stock: newStock, updated_at: new Date().toISOString() })
                      .eq('id', linkedProduct.id)
                    if (stockErr) throw stockErr

                    // B. Log movement
                    const { error: moveErr } = await supabase
                      .from('stock_movements')
                      .insert({
                        tenant_id: tenantId,
                        product_id: linkedProduct.id,
                        user_id: user?.id || '',
                        type: 'output',
                        quantity: prodQty,
                        previous_stock: linkedProduct.stock,
                        new_stock: newStock,
                        reason: `Venta vinculada a turno (Cliente: ${checkoutAppointment.client_name})`
                      })
                    if (moveErr) console.error('Error logging movement:', moveErr.message)

                    // C. Insert Sale
                    const { error: saleErr } = await supabase
                      .from('sales')
                      .insert({
                        tenant_id: tenantId,
                        customer_id: checkoutAppointment.customer_id || null,
                        product_name: linkedProduct.name,
                        quantity: prodQty,
                        price: linkedProduct.sale_price,
                        product_id: linkedProduct.id
                      })
                    if (saleErr) console.error('Error logging sale:', saleErr.message)

                    // D. Insert Product Transaction in Caja
                    const pTxRes = await fetch('/api/tenant/caja/transaction', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'income',
                        amount: productAmount,
                        payment_method: checkoutPaymentMethod,
                        category: 'producto',
                        reference_id: checkoutAppointment.id,
                        notes: `Producto vinculado a turno (${linkedProduct.name} x${prodQty}) - Cliente: ${checkoutAppointment.client_name}`
                      })
                    })
                    const pTxData = await pTxRes.json()
                    if (!pTxRes.ok) throw new Error(pTxData.error)
                  }

                  // 5. Update appointment status in DB
                  const { error: apptErr } = await supabase
                    .from('appointments')
                    .update({ status: 'completed', updated_at: new Date().toISOString() })
                    .eq('id', checkoutAppointment.id)
                  
                  if (apptErr) throw apptErr

                  // Load ticket print preview data
                  const combinedTotal = checkoutAppointment.total_price + productAmount
                  setPostCheckoutTx({
                    id: txData.transaction.id,
                    created_at: txData.transaction.created_at,
                    amount: combinedTotal,
                    payment_method: checkoutPaymentMethod,
                    category: 'servicio',
                    user: { first_name: currentUserName }
                  })

                  let tenantData: any = null
                  const { data: fullTenant, error: tenantErr } = await supabase
                    .from('tenants')
                    .select('name, address, cuit, phone, email, activity_start_date')
                    .eq('id', tenantId)
                    .single()

                  if (tenantErr) {
                    console.warn('Could not query full tenant details, falling back to name only:', tenantErr.message)
                    const { data: basicTenant } = await supabase
                      .from('tenants')
                      .select('name')
                      .eq('id', tenantId)
                      .single()
                    tenantData = basicTenant
                  } else {
                    tenantData = fullTenant
                  }

                  const descCombined = checkoutAppointment.services?.name + (linkedProduct ? ` + ${linkedProduct.name} (x${prodQty})` : '')

                  setPostCheckoutDetails({
                    tenantName: tenantData?.name || 'Mi Turno VIP',
                    tenantAddress: tenantData?.address || '',
                    tenantCuit: tenantData?.cuit || '',
                    tenantPhone: tenantData?.phone || '',
                    tenantEmail: tenantData?.email || '',
                    tenantActivityStart: tenantData?.activity_start_date || '',
                    clientName: checkoutAppointment.client_name,
                    serviceOrProduct: descCombined
                  })

                  setIsCheckoutModalOpen(false)
                  loadData()
                  showNotification('Turno cobrado y completado con éxito', 'success')
                  setIsPostCheckoutTicketOpen(true)
                } catch (err: any) {
                  setCheckoutError(err.message || 'Error al completar el cobro')
                } finally {
                  setCheckoutLoading(false)
                }
              }}
              disabled={!isCajaOpen || checkoutLoading}
              className="bg-primary hover:bg-primary-accent text-white font-semibold cursor-pointer"
            >
              {checkoutLoading ? 'Procesando...' : 'Confirmar Cobro'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: POST CHECKOUT TICKET PRINT PREVIEW */}
      <Modal
        isOpen={isPostCheckoutTicketOpen}
        onClose={() => setIsPostCheckoutTicketOpen(false)}
        title="Turno Cobrado con Éxito - Generar Recibo"
        size="md"
      >
        <div className="space-y-6">
          {/* Thermal Ticket Monospace view */}
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-inner max-w-sm mx-auto font-mono text-zinc-900 dark:text-zinc-100 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-200 via-transparent to-transparent bg-repeat-x bg-[length:10px_4px]"></div>
            
            <div className="text-center space-y-1">
              <h4 className="font-bold text-sm tracking-tight">{postCheckoutDetails?.tenantName?.toUpperCase()}</h4>
              {postCheckoutDetails?.tenantCuit && <p className="text-[9px] text-zinc-550 dark:text-zinc-400">CUIT: {postCheckoutDetails.tenantCuit}</p>}
              {postCheckoutDetails?.tenantAddress && <p className="text-[9px] text-zinc-550 dark:text-zinc-400">Dir: {postCheckoutDetails.tenantAddress}</p>}
              {postCheckoutDetails?.tenantPhone && <p className="text-[9px] text-zinc-550 dark:text-zinc-400">Tel: {postCheckoutDetails.tenantPhone}</p>}
              {postCheckoutDetails?.tenantEmail && <p className="text-[9px] text-zinc-550 dark:text-zinc-400">Email: {postCheckoutDetails.tenantEmail}</p>}
              {postCheckoutDetails?.tenantActivityStart && <p className="text-[9px] text-zinc-550 dark:text-zinc-400">Inicio Act: {postCheckoutDetails.tenantActivityStart}</p>}
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold mt-1">Ticket de Pago de Servicio</p>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500">
                {postCheckoutTx && new Date(postCheckoutTx.created_at).toLocaleString()}
              </p>
            </div>
            
            <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-3"></div>
            
            <div className="text-[10px] space-y-1">
              <p><strong>N°:</strong> #{postCheckoutTx?.id.slice(0, 8).toUpperCase()}</p>
              <p><strong>Atendido por:</strong> {postCheckoutTx?.user?.first_name || 'Personal'}</p>
              <p><strong>Cliente:</strong> {postCheckoutDetails?.clientName}</p>
            </div>
            
            <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-3"></div>
            
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between">
                <span className="font-bold">{postCheckoutDetails?.serviceOrProduct}</span>
                <span>{postCheckoutTx && new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(postCheckoutTx.amount)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-3"></div>

            <div className="text-right text-[10px] space-y-1">
              <p>Método de Pago: {postCheckoutTx ? (postCheckoutTx.payment_method === 'efectivo' ? 'Efectivo' : postCheckoutTx.payment_method === 'transferencia' ? 'Transferencia' : postCheckoutTx.payment_method === 'tarjeta_debito' ? 'Tarjeta Débito' : postCheckoutTx.payment_method === 'tarjeta_credito' ? 'Tarjeta Crédito' : 'MercadoPago') : ''}</p>
              <p className="font-bold text-sm">TOTAL: {postCheckoutTx && new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(postCheckoutTx.amount)}</p>
            </div>

            <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-3"></div>

            <div className="text-center text-[10px] font-bold tracking-wider text-zinc-800 dark:text-zinc-200 bg-zinc-150 dark:bg-zinc-800/50 py-1 rounded">
              NO VÁLIDO COMO FACTURA
            </div>

            <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-3"></div>

            <div className="text-center text-[9px] text-zinc-450 dark:text-zinc-500 space-y-0.5">
              <p>¡Gracias por elegirnos!</p>
              <p>miturnovip.com</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsPostCheckoutTicketOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              onClick={() => {
                // Setup print-only ticket elements in window
                const printDiv = document.createElement('div')
                printDiv.id = 'thermal-ticket'
                printDiv.style.fontFamily = 'monospace'
                printDiv.style.fontSize = '12px'
                printDiv.style.padding = '10px'
                printDiv.style.width = '80mm'
                printDiv.innerHTML = `
                  <div style="text-align: center; margin-bottom: 15px;">
                    <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">${postCheckoutDetails?.tenantName?.toUpperCase() || ''}</h3>
                    ${postCheckoutDetails?.tenantCuit ? `<p style="margin: 2px 0; font-size: 10px;">CUIT: ${postCheckoutDetails.tenantCuit}</p>` : ''}
                    ${postCheckoutDetails?.tenantAddress ? `<p style="margin: 2px 0; font-size: 10px;">Dir: ${postCheckoutDetails.tenantAddress}</p>` : ''}
                    ${postCheckoutDetails?.tenantPhone ? `<p style="margin: 2px 0; font-size: 10px;">Tel: ${postCheckoutDetails.tenantPhone}</p>` : ''}
                    ${postCheckoutDetails?.tenantEmail ? `<p style="margin: 2px 0; font-size: 10px;">Email: ${postCheckoutDetails.tenantEmail}</p>` : ''}
                    ${postCheckoutDetails?.tenantActivityStart ? `<p style="margin: 2px 0; font-size: 10px;">Inicio Act: ${postCheckoutDetails.tenantActivityStart}</p>` : ''}
                    <p style="margin: 5px 0 0 0; font-size: 10px; font-weight: bold;">Mi Turno VIP POS System</p>
                    <p style="margin: 0; font-size: 10px;">Fecha: ${postCheckoutTx ? new Date(postCheckoutTx.created_at).toLocaleString() : ''}</p>
                  </div>
                  <div style="border-bottom: 1px dashed #000; margin-bottom: 10px;"></div>
                  <div style="font-size: 11px; margin-bottom: 10px;">
                    <p style="margin: 3px 0"><strong>Ticket ID:</strong> #${postCheckoutTx ? postCheckoutTx.id.slice(0, 8).toUpperCase() : ''}</p>
                    <p style="margin: 3px 0"><strong>Atendido por:</strong> ${postCheckoutTx?.user?.first_name || 'Personal'}</p>
                    <p style="margin: 3px 0"><strong>Cliente:</strong> ${postCheckoutDetails?.clientName || ''}</p>
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
                      <tr>
                        <td style="padding-top: 5px;">${postCheckoutDetails?.serviceOrProduct || ''}</td>
                        <td style="text-align: right; padding-top: 5px; font-weight: bold;">
                          ${postCheckoutTx ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(postCheckoutTx.amount) : ''}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div style="border-bottom: 1px dashed #000; margin: 15px 0 10px 0;"></div>
                  <div style="font-size: 11px; text-align: right;">
                    <p style="margin: 3px 0"><strong>Método:</strong> ${postCheckoutTx ? (postCheckoutTx.payment_method === 'efectivo' ? 'Efectivo' : postCheckoutTx.payment_method === 'transferencia' ? 'Transferencia' : postCheckoutTx.payment_method === 'tarjeta_debito' ? 'Tarjeta Débito' : postCheckoutTx.payment_method === 'tarjeta_credito' ? 'Tarjeta Crédito' : 'MercadoPago') : ''}</p>
                    <p style="margin: 3px 0; font-size: 14px;"><strong>TOTAL:</strong> ${postCheckoutTx ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(postCheckoutTx.amount) : ''}</p>
                  </div>
                  <div style="border-bottom: 1px dashed #000; margin: 15px 0 10px 0;"></div>
                  <div style="text-align: center; font-size: 11px; font-weight: bold; border: 1px solid #000; padding: 3px 0; margin-bottom: 10px;">
                    NO VÁLIDO COMO FACTURA
                  </div>
                  <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
                  <div style="text-align: center; font-size: 10px;">
                    <p style="margin: 5px 0">¡Gracias por su visita!</p>
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
                printDiv.id = 'thermal-ticket-print-temp'
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
