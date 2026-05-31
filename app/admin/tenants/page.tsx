'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Edit2, Plus, Search, ShieldAlert, CheckCircle, RefreshCw, XCircle, Store, UserPlus, Sliders } from 'lucide-react'

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
    name: string;
    slug: string;
  } | null
}

interface EnabledModules {
  agenda: boolean
  servicios: boolean
  staff: boolean
  statistics: boolean
  marketing: boolean
  whatsapp: boolean
  clientes: boolean
  caja: boolean
}

const DEFAULT_MODULES: EnabledModules = {
  agenda: true,
  servicios: true,
  staff: true,
  statistics: false,
  marketing: false,
  whatsapp: false,
  clientes: true,
  caja: false,
}

const PLAN_DEFAULTS: Record<string, EnabledModules> = {
  essential: {
    agenda: true,
    servicios: true,
    staff: true,
    statistics: false,
    marketing: false,
    whatsapp: false,
    clientes: true,
    caja: false,
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
  }
}

interface Plan {
  id: string
  name: string
}

const getRemainingDays = (tenant: Tenant) => {
  const expirationStr = tenant.status === 'trial' ? tenant.trial_ends_at : tenant.current_period_end
  if (!expirationStr) return null
  
  const expDate = new Date(expirationStr)
  expDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const diffTime = expDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    status: 'trial' as Tenant['status'],
    plan_id: '',
    subscription_status: 'trialing' as Tenant['subscription_status'],
    trial_ends_at: '',
    current_period_end: '',
    adminEmail: '',
    adminPassword: '',
  })

  // Create User modal controls
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [selectedTenantForUser, setSelectedTenantForUser] = useState<Tenant | null>(null)
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    role: 'tenant_admin' as 'tenant_admin' | 'staff'
  })
  const [userErrorMsg, setUserErrorMsg] = useState('')
  const [userSuccessMsg, setUserSuccessMsg] = useState('')

  // Module Config Modal
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false)
  const [selectedTenantForModules, setSelectedTenantForModules] = useState<Tenant | null>(null)
  const [modulesConfig, setModulesConfig] = useState<EnabledModules>(DEFAULT_MODULES)
  const [modulesErrorMsg, setModulesErrorMsg] = useState('')
  const [modulesSuccessMsg, setModulesSuccessMsg] = useState('')

  const supabase = createClient()

  const handleOpenModulesModal = (tenant: Tenant) => {
    setSelectedTenantForModules(tenant)
    
    // Parse existing enabled_modules, or fall back to default
    const existing = tenant.enabled_modules as any
    if (existing && typeof existing === 'object') {
      setModulesConfig({
        agenda: existing.agenda ?? true,
        servicios: existing.servicios ?? true,
        staff: existing.staff ?? true,
        statistics: existing.statistics ?? false,
        marketing: existing.marketing ?? false,
        whatsapp: existing.whatsapp ?? false,
        clientes: existing.clientes ?? true,
        caja: existing.caja ?? false,
      })
    } else {
      setModulesConfig(DEFAULT_MODULES)
    }

    setModulesErrorMsg('')
    setModulesSuccessMsg('')
    setIsModulesModalOpen(true)
  }

  const handleResetToPlanDefaults = () => {
    if (!selectedTenantForModules) return
    const planSlug = selectedTenantForModules.subscription_plans?.slug || 'essential'
    const defaults = PLAN_DEFAULTS[planSlug] || PLAN_DEFAULTS['essential']
    setModulesConfig(defaults)
    setModulesSuccessMsg(`Valores cargados para el plan: ${selectedTenantForModules.subscription_plans?.name || 'Básico'}`)
    setTimeout(() => setModulesSuccessMsg(''), 3000)
  }

  const handleSaveModules = async (e: React.FormEvent) => {
    e.preventDefault()
    setModulesErrorMsg('')
    setModulesSuccessMsg('')

    if (!selectedTenantForModules) return

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          enabled_modules: modulesConfig
        })
        .eq('id', selectedTenantForModules.id)

      if (error) throw error

      // Update local state to reflect changes instantly
      setTenants(prev => prev.map(t => 
        t.id === selectedTenantForModules.id 
          ? { ...t, enabled_modules: modulesConfig } 
          : t
      ))

      setModulesSuccessMsg('Módulos actualizados con éxito.')
      setTimeout(() => {
        setIsModulesModalOpen(false)
        setModulesSuccessMsg('')
      }, 1500)
    } catch (err: any) {
      setModulesErrorMsg(err.message || 'Error al guardar configuración de módulos.')
    }
  }

  const handleOpenUserModal = (tenant: Tenant) => {
    setSelectedTenantForUser(tenant)
    setUserFormData({
      email: '',
      password: '',
      role: 'tenant_admin'
    })
    setUserErrorMsg('')
    setUserSuccessMsg('')
    setIsUserModalOpen(true)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserErrorMsg('')
    setUserSuccessMsg('')

    if (!selectedTenantForUser) return

    try {
      const response = await fetch('/api/admin/create-tenant-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: selectedTenantForUser.id,
          email: userFormData.email.trim(),
          password: userFormData.password,
          role: userFormData.role,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al registrar el usuario.')
      }

      setUserSuccessMsg(`Usuario creado con éxito para ${selectedTenantForUser.name}.`)
      setUserFormData({
        email: '',
        password: '',
        role: 'tenant_admin'
      })
      setTimeout(() => {
        setIsUserModalOpen(false)
        setUserSuccessMsg('')
      }, 3000)
    } catch (err: any) {
      setUserErrorMsg(err.message || 'Error al guardar usuario.')
    }
  }

  const fetchTenantsAndPlans = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*, subscription_plans(name, slug)')
        .order('created_at', { ascending: false })

      if (tenantsError) throw tenantsError
      setTenants(tenantsData || [])

      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .order('name')

      if (plansError) throw plansError
      setPlans(plansData || [])
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error al obtener datos de los comercios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenantsAndPlans()
  }, [])

  const handleOpenAddModal = () => {
    setEditingTenant(null)
    setFormData({
      name: '',
      slug: '',
      status: 'trial',
      plan_id: plans[0]?.id || '',
      subscription_status: 'trialing',
      trial_ends_at: '',
      current_period_end: '',
      adminEmail: '',
      adminPassword: '',
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan_id: tenant.plan_id || '',
      subscription_status: tenant.subscription_status,
      trial_ends_at: tenant.trial_ends_at ? tenant.trial_ends_at.split('T')[0] : '',
      current_period_end: tenant.current_period_end ? tenant.current_period_end.split('T')[0] : '',
      adminEmail: '',
      adminPassword: '',
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleToggleStatus = async (tenant: Tenant) => {
    const newStatus: Tenant['status'] = tenant.status === 'suspended' ? 'active' : 'suspended'
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ status: newStatus })
        .eq('id', tenant.id)

      if (error) throw error
      
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: newStatus } : t))
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const cleanSlug = formData.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '')
    if (!cleanSlug) {
      setErrorMsg('El slug no es válido.')
      return
    }

    const payload = {
      name: formData.name,
      slug: cleanSlug,
      status: formData.status,
      plan_id: formData.plan_id || null,
      subscription_status: formData.subscription_status,
      trial_ends_at: formData.trial_ends_at ? new Date(formData.trial_ends_at).toISOString() : null,
      current_period_end: formData.current_period_end ? new Date(formData.current_period_end).toISOString() : null,
    }

    try {
      if (editingTenant) {
        // Update existing tenant (directly client-side)
        const { error } = await supabase
          .from('tenants')
          .update(payload)
          .eq('id', editingTenant.id)

        if (error) throw error
      } else {
        // Validate administrator details before posting
        if (!formData.adminEmail || !formData.adminPassword) {
          setErrorMsg('El email y contraseña del administrador son requeridos.')
          return
        }
        if (formData.adminPassword.length < 6) {
          setErrorMsg('La contraseña del administrador debe tener al menos 6 caracteres.')
          return
        }

        // Create new tenant + initial user via API route
        const response = await fetch('/api/admin/create-tenant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            admin_email: formData.adminEmail,
            admin_password: formData.adminPassword,
          }),
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Error al registrar el comercio.')
        }
      }

      setIsModalOpen(false)
      fetchTenantsAndPlans()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar comercio.')
    }
  }

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusColors = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
    suspended: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
    trial: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Comercios (Tenants)</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Administra los salones registrados, sus slugs de dominio y estado de suscripción.</p>
        </div>
        <Button onClick={handleOpenAddModal} className="shrink-0 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Registrar Comercio
        </Button>
      </div>

      {/* Toolbar / Search */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o slug..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-card-custom border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-accent dark:text-zinc-50 placeholder-zinc-400 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="md" onClick={fetchTenantsAndPlans} className="p-2.5 cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white dark:bg-card-custom border border-border-custom rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-12 text-center">
          <Store className="w-12 h-12 text-primary/40 mx-auto mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">No se encontraron comercios</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Comienza agregando un nuevo comercio al sistema.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-zinc-50/50 dark:bg-primary-light/10">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Nombre / Slug</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Plan Activo</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Membresía</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Días Restantes</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Fin de Ciclo</th>
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
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                      {tenant.subscription_plans?.name || <span className="text-zinc-400 italic">Ninguno</span>}
                    </td>
                    <td className="px-6 py-4">
                      {tenant.status === 'active' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                          Activo
                        </span>
                      )}
                      {tenant.status === 'trial' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                          En Prueba
                        </span>
                      )}
                      {tenant.status === 'suspended' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                          Suspendido
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300 capitalize">
                      {tenant.subscription_status}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const days = getRemainingDays(tenant)
                        if (days === null) {
                          return <span className="text-zinc-400 dark:text-zinc-650 font-medium italic text-xs">-</span>
                        }
                        if (days <= 0) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30">
                              Vencido
                            </span>
                          )
                        }
                        if (days >= 10) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                              {days} {days === 1 ? 'día' : 'días'}
                            </span>
                          )
                        }
                        if (days >= 5) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                              {days} {days === 1 ? 'día' : 'días'}
                            </span>
                          )
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-rose-50 text-rose-750 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30 animate-pulse-slow">
                            {days} {days === 1 ? 'día' : 'días'}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {tenant.status === 'trial' 
                        ? (tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleDateString() : '-')
                        : (tenant.current_period_end ? new Date(tenant.current_period_end).toLocaleDateString() : '-')
                      }
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenModulesModal(tenant)}
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-55 dark:border-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-950/20 cursor-pointer"
                        title="Configurar Módulos"
                      >
                        <Sliders className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenUserModal(tenant)}
                        className="border-indigo-250 text-indigo-650 hover:bg-indigo-50 dark:border-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-950/20 cursor-pointer"
                        title="Crear Usuario"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(tenant)}
                        className={`transition-colors duration-200 cursor-pointer ${
                          tenant.status === 'suspended'
                            ? 'border-emerald-200 text-emerald-600 dark:border-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                            : 'border-rose-250 text-rose-600 dark:border-rose-900/40 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                        }`}
                        title={tenant.status === 'suspended' ? 'Re-activar Cuenta' : 'Suspender Cuenta'}
                      >
                        {tenant.status === 'suspended' ? <CheckCircle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(tenant)}
                        className="hover:border-primary hover:text-primary transition-all duration-150 cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal dialog for Add / Edit Tenant */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTenant ? 'Editar Comercio' : 'Registrar Nuevo Comercio'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Input
            label="Nombre del Comercio"
            placeholder="Ej. Peluquería Bella Vista"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div>
            <Input
              label="Slug de Ruta / Subdominio"
              placeholder="ej. bellavista"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
            <p className="text-[10px] text-zinc-400 mt-1 dark:text-zinc-500">
              Solo letras minúsculas, números y guiones. Sin espacios.
            </p>
          </div>

          <Select
            label="Estado de Cuenta"
            options={[
              { label: 'En Prueba (Trial)', value: 'trial' },
              { label: 'Activo (Habilitado)', value: 'active' },
              { label: 'Suspendido (Bloqueado)', value: 'suspended' },
            ]}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as Tenant['status'] })}
          />

          <Select
            label="Plan de Suscripción"
            options={[
              { label: 'Ningún Plan', value: '' },
              ...plans.map(p => ({ label: p.name, value: p.id }))
            ]}
            value={formData.plan_id}
            onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
          />

          <Select
            label="Estado de Facturación"
            options={[
              { label: 'Trialing', value: 'trialing' },
              { label: 'Active (Al día)', value: 'active' },
              { label: 'Past Due (Vencido)', value: 'past_due' },
              { label: 'Canceled', value: 'canceled' },
              { label: 'Unpaid (Impago)', value: 'unpaid' },
            ]}
            value={formData.subscription_status}
            onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value as Tenant['subscription_status'] })}
          />

          <Input
            label="Fecha Fin de Prueba (Trial Ends At)"
            type="date"
            value={formData.trial_ends_at}
            onChange={(e) => setFormData({ ...formData, trial_ends_at: e.target.value })}
          />

          <Input
            label="Fecha Fin de Período (Billing Period End)"
            type="date"
            value={formData.current_period_end}
            onChange={(e) => setFormData({ ...formData, current_period_end: e.target.value })}
          />

          {/* Form fields for initial administrator user (creation only) */}
          {!editingTenant && (
            <div className="border-t border-border-custom pt-4 space-y-4">
              <h4 className="text-xs font-bold text-primary dark:text-primary-hover uppercase tracking-wider">
                Usuario Administrador del Comercio
              </h4>
              <Input
                label="Email del Administrador"
                type="email"
                placeholder="admin@comercio.com"
                required
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              />
              <Input
                label="Contraseña Inicial"
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
                value={formData.adminPassword}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingTenant ? 'Guardar Cambios' : 'Registrar Comercio'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal dialog for Create User for Existing Tenant */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={`Crear Usuario para ${selectedTenantForUser?.name}`}
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {userErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{userErrorMsg}</span>
            </div>
          )}

          {userSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs flex items-start gap-2 dark:bg-emerald-950/20 dark:border-emerald-950/30 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{userSuccessMsg}</span>
            </div>
          )}

          <Input
            label="Correo electrónico"
            type="email"
            placeholder="ejemplo@correo.com"
            required
            value={userFormData.email}
            onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            required
            value={userFormData.password}
            onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
          />

          <Select
            label="Rol de Usuario"
            options={[
              { label: 'Administrador de Comercio', value: 'tenant_admin' },
              { label: 'Empleado / Staff (Acceso limitado)', value: 'staff' },
            ]}
            value={userFormData.role}
            onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'tenant_admin' | 'staff' })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear Usuario
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal dialog for Module Configuration */}
      <Modal
        isOpen={isModulesModalOpen}
        onClose={() => setIsModulesModalOpen(false)}
        title={`Configurar Módulos Habilitados - ${selectedTenantForModules?.name}`}
      >
        <form onSubmit={handleSaveModules} className="space-y-6">
          {modulesErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{modulesErrorMsg}</span>
            </div>
          )}

          {modulesSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs flex items-start gap-2 dark:bg-emerald-950/20 dark:border-emerald-950/30 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{modulesSuccessMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 p-4 border border-border-custom rounded-xl">
            <div>
              <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Plan Activo</span>
              <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                {selectedTenantForModules?.subscription_plans?.name || 'Plan Básico (Essential)'}
              </p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleResetToPlanDefaults}
              className="text-xs shrink-0 flex items-center gap-1.5"
            >
              Restaurar por Plan
            </Button>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Módulos del Sistema</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Agenda */}
              <label className="flex items-start gap-3 p-3 bg-white dark:bg-card-custom border border-border-custom rounded-xl cursor-pointer hover:border-zinc-350 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
                  checked={modulesConfig.agenda}
                  onChange={(e) => setModulesConfig({ ...modulesConfig, agenda: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Agenda / Turnos</span>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Calendario de turnos y agendamientos.</p>
                </div>
              </label>

              {/* Servicios */}
              <label className="flex items-start gap-3 p-3 bg-white dark:bg-card-custom border border-border-custom rounded-xl cursor-pointer hover:border-zinc-350 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
                  checked={modulesConfig.servicios}
                  onChange={(e) => setModulesConfig({ ...modulesConfig, servicios: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Catálogo Servicios</span>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Tratamientos, cortes y precios del salón.</p>
                </div>
              </label>

              {/* Staff */}
              <label className="flex items-start gap-3 p-3 bg-white dark:bg-card-custom border border-border-custom rounded-xl cursor-pointer hover:border-zinc-350 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
                  checked={modulesConfig.staff}
                  onChange={(e) => setModulesConfig({ ...modulesConfig, staff: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Personal / Staff</span>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Registro de estilistas y roles de acceso.</p>
                </div>
              </label>

              {/* Clientes */}
              <label className="flex items-start gap-3 p-3 bg-white dark:bg-card-custom border border-border-custom rounded-xl cursor-pointer hover:border-zinc-350 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
                  checked={modulesConfig.clientes}
                  onChange={(e) => setModulesConfig({ ...modulesConfig, clientes: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Fichas Clientes</span>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Gestión de clientes, historial de visitas y compras.</p>
                </div>
              </label>

              {/* Statistics */}
              <label className="flex items-start gap-3 p-3 bg-white dark:bg-card-custom border border-border-custom rounded-xl cursor-pointer hover:border-zinc-350 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
                  checked={modulesConfig.statistics}
                  onChange={(e) => setModulesConfig({ ...modulesConfig, statistics: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Estadísticas / Reportes</span>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Resumen diario, recaudación y ocupación.</p>
                </div>
              </label>

              {/* Marketing */}
              <label className="flex items-start gap-3 p-3 bg-white dark:bg-card-custom border border-border-custom rounded-xl cursor-pointer hover:border-zinc-350 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
                  checked={modulesConfig.marketing}
                  onChange={(e) => setModulesConfig({ ...modulesConfig, marketing: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Marketing y Promos</span>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Herramientas de fidelización y campañas.</p>
                </div>
              </label>

              {/* Whatsapp */}
              <label className="flex items-start gap-3 p-3 bg-white dark:bg-card-custom border border-border-custom rounded-xl cursor-pointer hover:border-zinc-350 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
                  checked={modulesConfig.whatsapp}
                  onChange={(e) => setModulesConfig({ ...modulesConfig, whatsapp: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Recordatorios WhatsApp</span>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Notificaciones automatizadas de turnos.</p>
                </div>
              </label>

              {/* Caja */}
              <label className="flex items-start gap-3 p-3 bg-white dark:bg-card-custom border border-border-custom rounded-xl cursor-pointer hover:border-zinc-350 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
                  checked={modulesConfig.caja}
                  onChange={(e) => setModulesConfig({ ...modulesConfig, caja: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Caja Diaria (POS)</span>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Control de ingresos, egresos, arqueos y reportes financieros.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button type="button" variant="outline" onClick={() => setIsModulesModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar Configuración
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
