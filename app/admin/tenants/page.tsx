'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Edit2, Plus, Search, ShieldAlert, CheckCircle, RefreshCw, XCircle, Store } from 'lucide-react'

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
  subscription_plans?: {
    name: string
  } | null
}

interface Plan {
  id: string
  name: string
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
  })

  const supabase = createClient()

  const fetchTenantsAndPlans = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      // Fetch tenants with plan name joined
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*, subscription_plans(name)')
        .order('created_at', { ascending: false })

      if (tenantsError) throw tenantsError
      setTenants(tenantsData || [])

      // Fetch plans for dropdown selection
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
      
      // Update local state
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
        // Update existing tenant
        const { error } = await supabase
          .from('tenants')
          .update(payload)
          .eq('id', editingTenant.id)

        if (error) throw error
      } else {
        // Create new tenant
        const { error } = await supabase
          .from('tenants')
          .insert([payload])

        if (error) throw error
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
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                      {tenant.subscription_plans?.name || <span className="text-zinc-400 italic">Ninguno</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[tenant.status]}`}>
                        {tenant.status === 'active' && 'Activo'}
                        {tenant.status === 'suspended' && 'Suspendido'}
                        {tenant.status === 'trial' && 'En Prueba'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300 capitalize">
                      {tenant.subscription_status}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {tenant.status === 'trial' 
                        ? (tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleDateString() : '-')
                        : (tenant.current_period_end ? new Date(tenant.current_period_end).toLocaleDateString() : '-')
                      }
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        variant={tenant.status === 'suspended' ? 'outline' : 'danger'}
                        size="sm"
                        onClick={() => handleToggleStatus(tenant)}
                        title={tenant.status === 'suspended' ? 'Re-activar Cuenta' : 'Suspender Cuenta'}
                      >
                        {tenant.status === 'suspended' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEditModal(tenant)}
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
    </div>
  )
}
