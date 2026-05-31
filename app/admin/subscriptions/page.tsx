'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Plus, Edit2, Check, XCircle, CreditCard, Users, Search, RefreshCw, Star, Info } from 'lucide-react'

interface Plan {
  id: string
  name: string
  slug: string
  price: number
  billing_interval: string
  max_staff: number | null
  max_appointments_per_month: number | null
  features: string[] | any
  created_at: string
}

interface Tenant {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'trial'
  plan_id: string | null
  subscription_status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing'
  trial_ends_at: string | null
  current_period_end: string | null
  created_at: string
  enabled_modules?: any
  subscription_plans?: {
    name: string
    slug?: string
  } | null
}

const PLAN_DEFAULTS: Record<string, any> = {
  essential: {
    agenda: true,
    servicios: true,
    staff: true,
    statistics: false,
    marketing: false,
    whatsapp: false,
    clientes: true,
    caja: false,
    inventario: false,
    ventas_mostrador: false,
  },
  basico: {
    agenda: true,
    servicios: true,
    staff: true,
    statistics: false,
    marketing: false,
    whatsapp: false,
    clientes: true,
    caja: false,
    inventario: false,
    ventas_mostrador: false,
  },
  pro: {
    agenda: true,
    servicios: true,
    staff: true,
    statistics: true,
    marketing: false,
    whatsapp: false,
    clientes: true,
    caja: true,
    inventario: true,
    ventas_mostrador: true,
  },
  vip: {
    agenda: true,
    servicios: true,
    staff: true,
    statistics: true,
    marketing: true,
    whatsapp: true,
    clientes: true,
    caja: true,
    inventario: true,
    ventas_mostrador: true,
  },
  premium: {
    agenda: true,
    servicios: true,
    staff: true,
    statistics: true,
    marketing: true,
    whatsapp: true,
    clientes: true,
    caja: true,
    inventario: true,
    ventas_mostrador: true,
  }
}

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'assign'>('plans')
  
  // Data states
  const [plans, setPlans] = useState<Plan[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal controls
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)

  // Plan Form state
  const [planFormData, setPlanFormData] = useState({
    name: '',
    slug: '',
    price: '0.00',
    billing_interval: 'month',
    max_staff: '',
    max_appointments_per_month: '',
    featuresText: '',
  })

  // Assign Form state
  const [assignFormData, setAssignFormData] = useState({
    plan_id: '',
    subscription_status: 'trialing' as Tenant['subscription_status'],
    trial_ends_at: '',
    current_period_end: '',
    duration: '30', // New: duration in days ('30', '60', '90', '180', '365', 'custom')
  })

  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true })

      if (plansError) throw plansError
      setPlans(plansData || [])

      // Fetch tenants with plan details
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*, subscription_plans(name, slug)')
        .order('created_at', { ascending: false })

      if (tenantsError) throw tenantsError
      setTenants(tenantsData || [])
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error al obtener datos de suscripción.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // --- PLAN CRUD FUNCTIONS ---
  const handleOpenAddPlanModal = () => {
    setEditingPlan(null)
    setPlanFormData({
      name: '',
      slug: '',
      price: '0.00',
      billing_interval: 'month',
      max_staff: '',
      max_appointments_per_month: '',
      featuresText: '',
    })
    setErrorMsg('')
    setIsPlanModalOpen(true)
  }

  const handleOpenEditPlanModal = (plan: Plan) => {
    setEditingPlan(plan)
    let feats = ''
    if (Array.isArray(plan.features)) {
      feats = plan.features.join(', ')
    }
    setPlanFormData({
      name: plan.name,
      slug: plan.slug,
      price: plan.price.toString(),
      billing_interval: plan.billing_interval,
      max_staff: plan.max_staff !== null ? plan.max_staff.toString() : '',
      max_appointments_per_month: plan.max_appointments_per_month !== null ? plan.max_appointments_per_month.toString() : '',
      featuresText: feats,
    })
    setErrorMsg('')
    setIsPlanModalOpen(true)
  }

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const cleanSlug = planFormData.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '')
    if (!cleanSlug) {
      setErrorMsg('El slug no es válido.')
      return
    }

    const featuresArray = planFormData.featuresText
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0)

    const payload = {
      name: planFormData.name,
      slug: cleanSlug,
      price: parseFloat(planFormData.price) || 0.00,
      billing_interval: planFormData.billing_interval,
      max_staff: planFormData.max_staff ? parseInt(planFormData.max_staff, 10) : null,
      max_appointments_per_month: planFormData.max_appointments_per_month ? parseInt(planFormData.max_appointments_per_month, 10) : null,
      features: featuresArray,
    }

    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(payload)
          .eq('id', editingPlan.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert([payload])

        if (error) throw error
      }

      setIsPlanModalOpen(false)
      fetchData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el plan.')
    }
  }

  // --- SUBSCRIPTION ASSIGNMENT FUNCTIONS ---
  const handleOpenAssignModal = (tenant: Tenant) => {
    setEditingTenant(tenant)
    
    // Initial values
    const initialPlanId = tenant.plan_id || ''
    const initialStatus = tenant.subscription_status
    const initialTrial = tenant.trial_ends_at ? tenant.trial_ends_at.split('T')[0] : ''
    const initialEnd = tenant.current_period_end ? tenant.current_period_end.split('T')[0] : ''
    
    setAssignFormData({
      plan_id: initialPlanId,
      subscription_status: initialStatus,
      trial_ends_at: initialTrial,
      current_period_end: initialEnd,
      duration: '30',
    })
    
    setErrorMsg('')
    setIsAssignModalOpen(true)
    
    // Auto-calculate end date for 30 days initially if a plan is assigned and end date is empty
    if (initialPlanId && !initialEnd) {
      const date = new Date()
      date.setDate(date.getDate() + 30)
      setAssignFormData(prev => ({
        ...prev,
        current_period_end: date.toISOString().split('T')[0],
        duration: '30',
      }))
    }
  }

  // Calculate dynamic values when plan or duration changes
  const handleAssignFormChange = (updatedFields: Partial<typeof assignFormData>) => {
    const nextForm = { ...assignFormData, ...updatedFields }
    
    // If duration changes and is not 'custom', calculate new end date
    if (updatedFields.duration && updatedFields.duration !== 'custom') {
      const days = parseInt(updatedFields.duration, 10)
      const date = new Date()
      date.setDate(date.getDate() + days)
      nextForm.current_period_end = date.toISOString().split('T')[0]
    }
    
    // If plan_id changes to empty, clear end dates and duration
    if (updatedFields.plan_id === '') {
      nextForm.current_period_end = ''
      nextForm.duration = 'custom'
    } else if (updatedFields.plan_id && !nextForm.current_period_end) {
      // If plan is selected and no end date is set, default to 30 days
      nextForm.duration = '30'
      const date = new Date()
      date.setDate(date.getDate() + 30)
      nextForm.current_period_end = date.toISOString().split('T')[0]
    }

    setAssignFormData(nextForm)
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!editingTenant) return

    // Limit check if plan is changing
    if (assignFormData.plan_id !== editingTenant.plan_id) {
      const selectedPlan = plans.find(p => p.id === assignFormData.plan_id)
      if (selectedPlan && selectedPlan.max_staff !== null) {
        const { count, error: countErr } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', editingTenant.id)
          .in('role', ['tenant_admin', 'staff'])

        if (countErr) {
          setErrorMsg('Error al verificar la cantidad de profesionales en este comercio.')
          return
        }

        if ((count || 0) > selectedPlan.max_staff) {
          setErrorMsg(`No se puede degradar el plan. El comercio tiene ${count} profesional(es) activo(s), pero el plan seleccionado admite un máximo de ${selectedPlan.max_staff} (incluyendo el administrador).`)
          return
        }
      }
    }

    const payload: any = {
      plan_id: assignFormData.plan_id || null,
      subscription_status: assignFormData.subscription_status,
      trial_ends_at: assignFormData.trial_ends_at ? new Date(assignFormData.trial_ends_at).toISOString() : null,
      current_period_end: assignFormData.current_period_end ? new Date(assignFormData.current_period_end).toISOString() : null,
    }

    if (assignFormData.plan_id !== editingTenant.plan_id) {
      const selectedPlan = plans.find(p => p.id === assignFormData.plan_id)
      const planSlug = selectedPlan?.slug || 'basico'
      const defaultModules = PLAN_DEFAULTS[planSlug] || PLAN_DEFAULTS['basico']
      payload.enabled_modules = defaultModules
    }

    try {
      const { error } = await supabase
          .from('tenants')
          .update(payload)
          .eq('id', editingTenant.id)

      if (error) throw error

      setIsAssignModalOpen(false)
      fetchData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al asignar la suscripción.')
    }
  }

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const subscriptionStatusColors = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
    trialing: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
    past_due: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
    canceled: 'bg-zinc-50 text-zinc-600 border-zinc-150 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
    unpaid: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
  }

  // Calculate pricing summary for display
  const selectedPlan = plans.find(p => p.id === assignFormData.plan_id)
  const durationDays = parseInt(assignFormData.duration, 10)
  const calculatedPrice = selectedPlan && !isNaN(durationDays)
    ? selectedPlan.price * (durationDays / 30)
    : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Gestión de Suscripciones</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Configura los planes del SaaS y asígnalos directamente a tus comercios registrados.</p>
        </div>
        
        {activeTab === 'plans' && (
          <Button onClick={handleOpenAddPlanModal} className="shrink-0 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Crear Plan de Pago
          </Button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border-custom">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'plans'
              ? 'border-primary text-primary dark:border-primary dark:text-primary font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span>Planes de Pago</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('assign')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'assign'
              ? 'border-primary text-primary dark:border-primary dark:text-primary font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Asignar a Comercios</span>
          </div>
        </button>
      </div>

      {/* TAB 1: PLANS CRUD */}
      {activeTab === 'plans' && (
        <>
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map(i => (
                <div key={i} className="h-64 bg-white dark:bg-card-custom border border-border-custom rounded-xl animate-pulse" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-12 text-center max-w-lg mx-auto">
              <CreditCard className="w-12 h-12 text-primary/40 mx-auto mb-4" />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">No hay planes creados</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Registra los planes que ofrecerás a los dueños de salones.</p>
              <Button onClick={handleOpenAddPlanModal} className="mt-4">
                Crear tu primer Plan
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const isPro = plan.slug === 'pro'
                return (
                  <div
                    key={plan.id}
                    className={`bg-white dark:bg-card-custom border ${
                      isPro 
                        ? 'ring-2 ring-primary border-transparent dark:ring-primary dark:border-transparent scale-102 z-10 shadow-md' 
                        : 'border-border-custom'
                    } rounded-xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
                          {isPro && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
                        </div>
                        {isPro ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white dark:bg-primary dark:text-zinc-950 uppercase tracking-wide">
                            Recomendado
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary-light text-primary">
                            /{plan.slug}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-baseline">
                        <span className="text-3xl font-extrabold tracking-tight text-primary dark:text-primary">
                          ${Number(plan.price).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="ml-1 text-sm text-zinc-505 dark:text-zinc-400 font-medium">
                          / {plan.billing_interval === 'month' ? '30 días' : 'año'}
                        </span>
                      </div>

                      <ul className="mt-6 space-y-2.5 border-t border-border-custom pt-4">
                        <li className="text-xs text-zinc-650 dark:text-zinc-305 flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>Límite Personal: {plan.max_staff !== null ? `${plan.max_staff} empleados` : 'Ilimitado'}</span>
                        </li>
                        <li className="text-xs text-zinc-655 dark:text-zinc-305 flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>Turnos/mes: {plan.max_appointments_per_month !== null ? `${plan.max_appointments_per_month} reservas` : 'Ilimitado'}</span>
                        </li>
                        {Array.isArray(plan.features) && plan.features.map((feat: string, idx: number) => (
                          <li key={idx} className="text-xs text-zinc-650 dark:text-zinc-305 flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8 pt-4 border-t border-border-custom flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditPlanModal(plan)} className="flex items-center gap-2 cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar Plan
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: ASSIGN SUBSCRIPTIONS TO TENANTS */}
      {activeTab === 'assign' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-3 w-full max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar comercio..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-card-custom border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-accent dark:text-zinc-50 placeholder-zinc-400 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="md" onClick={fetchData} className="p-2.5 cursor-pointer">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Tenants list table */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-white dark:bg-card-custom border border-border-custom rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-12 text-center">
              <Users className="w-12 h-12 text-primary/40 mx-auto mb-4" />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">No se encontraron comercios</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Registra comercios en la pestaña Comercios para asignarles planes.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom bg-zinc-50/50 dark:bg-primary-light/10">
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Comercio</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Plan Asignado</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Estado Membresía</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Vencimiento / Trial</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom">
                    {filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-primary-light/20 dark:hover:bg-primary-light/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{tenant.name}</div>
                          <div className="text-xs text-zinc-400 dark:text-zinc-500">/{tenant.slug}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                          {tenant.subscription_plans?.name || (
                            <span className="text-zinc-400 dark:text-zinc-650 italic">Sin Suscripción</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {tenant.subscription_status === 'active' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                              active
                            </span>
                          )}
                          {tenant.subscription_status === 'trialing' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                              trialing
                            </span>
                          )}
                          {tenant.subscription_status === 'past_due' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                              past due
                            </span>
                          )}
                          {tenant.subscription_status === 'canceled' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-zinc-50 text-zinc-600 border-zinc-150 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0"></span>
                              canceled
                            </span>
                          )}
                          {tenant.subscription_status === 'unpaid' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                              unpaid
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                          {tenant.subscription_status === 'trialing'
                            ? (tenant.trial_ends_at ? `Prueba fin: ${new Date(tenant.trial_ends_at).toLocaleDateString()}` : '-')
                            : (tenant.current_period_end ? `Ciclo fin: ${new Date(tenant.current_period_end).toLocaleDateString()}` : '-')
                          }
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenAssignModal(tenant)}
                            className="flex items-center gap-1.5 ml-auto border border-border-custom hover:border-primary hover:text-primary transition-all duration-150 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Asignar Plan</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT PLAN */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={editingPlan ? 'Editar Plan de Suscripción' : 'Crear Plan de Suscripción'}
      >
        <form onSubmit={handlePlanSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Input
            label="Nombre del Plan"
            placeholder="Ej. Plan Pro"
            required
            value={planFormData.name}
            onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
          />

          <div>
            <Input
              label="Slug del Plan"
              placeholder="ej. pro"
              required
              value={planFormData.slug}
              onChange={(e) => setPlanFormData({ ...planFormData, slug: e.target.value })}
            />
            <p className="text-[10px] text-zinc-400 mt-1 dark:text-zinc-500">
              Identificador único en minúsculas. Ej: basico, pro, premium.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio (ARS) para 30 días"
              type="number"
              step="0.01"
              required
              value={planFormData.price}
              onChange={(e) => setPlanFormData({ ...planFormData, price: e.target.value })}
            />
            <Select
              label="Frecuencia Base"
              options={[
                { label: 'Mensual (30 días)', value: 'month' },
                { label: 'Anual (365 días)', value: 'year' },
              ]}
              value={planFormData.billing_interval}
              onChange={(e) => setPlanFormData({ ...planFormData, billing_interval: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Límite Personal (Máx. Staff)"
                type="number"
                placeholder="Ej. 10"
                value={planFormData.max_staff}
                onChange={(e) => setPlanFormData({ ...planFormData, max_staff: e.target.value })}
              />
              <p className="text-[9px] text-zinc-400 mt-1 dark:text-zinc-500">
                Vacío para Ilimitado.
              </p>
            </div>
            <div>
              <Input
                label="Reservas Mensuales"
                type="number"
                placeholder="Ej. 1500"
                value={planFormData.max_appointments_per_month}
                onChange={(e) => setPlanFormData({ ...planFormData, max_appointments_per_month: e.target.value })}
              />
              <p className="text-[9px] text-zinc-400 mt-1 dark:text-zinc-500">
                Vacío para Ilimitado.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1 dark:text-zinc-400 uppercase tracking-wide">
              Características del Plan
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm bg-white dark:bg-card-custom border border-border-custom rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-accent min-h-[80px]"
              placeholder="Ej: Turnos Online, Recordatorios WhatsApp, Soporte VIP"
              value={planFormData.featuresText}
              onChange={(e) => setPlanFormData({ ...planFormData, featuresText: e.target.value })}
            />
            <p className="text-[10px] text-zinc-400 mt-1 dark:text-zinc-500">
              Separa cada característica con una coma.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button type="button" variant="outline" onClick={() => setIsPlanModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGN SUBSCRIPTION TO TENANT */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Asignar Suscripción: ${editingTenant?.name || ''}`}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Select
            label="Plan de Suscripción"
            options={[
              { label: 'Ningún Plan (Remover)', value: '' },
              ...plans.map(p => ({ label: p.name, value: p.id }))
            ]}
            value={assignFormData.plan_id}
            onChange={(e) => handleAssignFormChange({ plan_id: e.target.value })}
          />

          {assignFormData.plan_id && (
            <Select
              label="Duración del Período"
              options={[
                { label: '30 Días (1 Mes)', value: '30' },
                { label: '60 Días (2 Meses)', value: '60' },
                { label: '90 Días (3 Meses)', value: '90' },
                { label: '180 Días (6 Meses)', value: '180' },
                { label: '365 Días (1 Año)', value: '365' },
                { label: 'Personalizado (Fecha manual)', value: 'custom' },
              ]}
              value={assignFormData.duration}
              onChange={(e) => handleAssignFormChange({ duration: e.target.value })}
            />
          )}

          <Select
            label="Estado de Facturación"
            options={[
              { label: 'Trialing (En Prueba)', value: 'trialing' },
              { label: 'Active (Al día)', value: 'active' },
              { label: 'Past Due (Vencido)', value: 'past_due' },
              { label: 'Canceled (Cancelado)', value: 'canceled' },
              { label: 'Unpaid (Impago)', value: 'unpaid' },
            ]}
            value={assignFormData.subscription_status}
            onChange={(e) => handleAssignFormChange({ subscription_status: e.target.value as Tenant['subscription_status'] })}
          />

          <Input
            label="Fecha Fin de Prueba (Solo si está en Trialing)"
            type="date"
            value={assignFormData.trial_ends_at}
            onChange={(e) => handleAssignFormChange({ trial_ends_at: e.target.value })}
          />

          <Input
            label="Fecha Fin de Período de Facturación"
            type="date"
            value={assignFormData.current_period_end}
            onChange={(e) => handleAssignFormChange({ current_period_end: e.target.value })}
            disabled={assignFormData.duration !== 'custom'}
          />

          {/* Pricing Calculation Summary Box */}
          {selectedPlan && (
            <div className="bg-primary-light/50 dark:bg-primary-light/20 p-4 border border-primary/20 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-primary dark:text-primary-hover uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 shrink-0" />
                Resumen de Liquidación
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <span>Precio base (30 días):</span>
                <span className="text-right">${selectedPlan.price.toLocaleString('es-AR')} ARS</span>
                
                <span>Duración seleccionada:</span>
                <span className="text-right">
                  {assignFormData.duration === 'custom' 
                    ? 'Manualmente especificado' 
                    : `${assignFormData.duration} días (${Math.round(durationDays / 30)} meses)`
                  }
                </span>
                
                <div className="col-span-2 border-t border-primary/20 my-1 pt-1.5 flex justify-between text-sm font-extrabold text-primary dark:text-primary-hover">
                  <span>Monto Total Proyectado:</span>
                  <span>
                    {assignFormData.duration === 'custom' 
                      ? 'N/A' 
                      : `$${calculatedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS`
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar Asignación
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
