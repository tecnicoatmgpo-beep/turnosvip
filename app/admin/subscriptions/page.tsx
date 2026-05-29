'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Plus, Edit2, Check, XCircle, CreditCard } from 'lucide-react'

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

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price: '0.00',
    billing_interval: 'month',
    max_staff: '',
    max_appointments_per_month: '',
    featuresText: '',
  })

  const supabase = createClient()

  const fetchPlans = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true })

      if (error) throw error
      setPlans(data || [])
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error al obtener planes de suscripción.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleOpenAddModal = () => {
    setEditingPlan(null)
    setFormData({
      name: '',
      slug: '',
      price: '0.00',
      billing_interval: 'month',
      max_staff: '',
      max_appointments_per_month: '',
      featuresText: '',
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (plan: Plan) => {
    setEditingPlan(plan)
    let feats = ''
    if (Array.isArray(plan.features)) {
      feats = plan.features.join(', ')
    }
    setFormData({
      name: plan.name,
      slug: plan.slug,
      price: plan.price.toString(),
      billing_interval: plan.billing_interval,
      max_staff: plan.max_staff !== null ? plan.max_staff.toString() : '',
      max_appointments_per_month: plan.max_appointments_per_month !== null ? plan.max_appointments_per_month.toString() : '',
      featuresText: feats,
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const cleanSlug = formData.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '')
    if (!cleanSlug) {
      setErrorMsg('El slug no es válido.')
      return
    }

    // Parse features from comma-separated list
    const featuresArray = formData.featuresText
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0)

    const payload = {
      name: formData.name,
      slug: cleanSlug,
      price: parseFloat(formData.price) || 0.00,
      billing_interval: formData.billing_interval,
      max_staff: formData.max_staff ? parseInt(formData.max_staff, 10) : null,
      max_appointments_per_month: formData.max_appointments_per_month ? parseInt(formData.max_appointments_per_month, 10) : null,
      features: featuresArray,
    }

    try {
      if (editingPlan) {
        // Update existing plan
        const { error } = await supabase
          .from('subscription_plans')
          .update(payload)
          .eq('id', editingPlan.id)

        if (error) throw error
      } else {
        // Insert new plan
        const { error } = await supabase
          .from('subscription_plans')
          .insert([payload])

        if (error) throw error
      }

      setIsModalOpen(false)
      fetchPlans()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar plan.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Planes de Suscripción</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Administra los paquetes de precios y las cuotas de recursos asignadas a los comercios.</p>
        </div>
        <Button onClick={handleOpenAddModal} className="shrink-0 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Crear Plan de Pago
        </Button>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map(i => (
            <div key={i} className="h-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center max-w-lg mx-auto">
          <CreditCard className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">No hay planes creados</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Registra los planes que ofrecerás a los dueños de salones.</p>
          <Button onClick={handleOpenAddModal} className="mt-4">
            Crear tu primer Plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    /{plan.slug}
                  </span>
                </div>
                
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                    ${Number(plan.price).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="ml-1 text-sm text-zinc-500 dark:text-zinc-400">
                    / {plan.billing_interval === 'month' ? 'mes' : 'año'}
                  </span>
                </div>

                <ul className="mt-6 space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                  <li className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                    <span>Límite Personal: {plan.max_staff !== null ? `${plan.max_staff} empleados` : 'Ilimitado'}</span>
                  </li>
                  <li className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                    <span>Turnos/mes: {plan.max_appointments_per_month !== null ? `${plan.max_appointments_per_month} reservas` : 'Ilimitado'}</span>
                  </li>
                  {Array.isArray(plan.features) && plan.features.map((feat: string, idx: number) => (
                    <li key={idx} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(plan)} className="flex items-center gap-2">
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar Plan
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal dialog for Add / Edit Plan */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Editar Plan de Suscripción' : 'Crear Plan de Suscripción'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Input
            label="Nombre del Plan"
            placeholder="Ej. Plan Básico"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div>
            <Input
              label="Slug del Plan"
              placeholder="ej. basico"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
            <p className="text-[10px] text-zinc-400 mt-1 dark:text-zinc-500">
              Identificador único en minúsculas. Ej: basico, pro, premium.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio"
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <Select
              label="Frecuencia"
              options={[
                { label: 'Mensual', value: 'month' },
                { label: 'Anual', value: 'year' },
              ]}
              value={formData.billing_interval}
              onChange={(e) => setFormData({ ...formData, billing_interval: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Límite Personal (Máx. Staff)"
                type="number"
                placeholder="Ej. 5"
                value={formData.max_staff}
                onChange={(e) => setFormData({ ...formData, max_staff: e.target.value })}
              />
              <p className="text-[9px] text-zinc-400 mt-1 dark:text-zinc-500">
                Vacío para Ilimitado.
              </p>
            </div>
            <div>
              <Input
                label="Reservas Mensuales"
                type="number"
                placeholder="Ej. 500"
                value={formData.max_appointments_per_month}
                onChange={(e) => setFormData({ ...formData, max_appointments_per_month: e.target.value })}
              />
              <p className="text-[9px] text-zinc-400 mt-1 dark:text-zinc-500">
                Vacío para Ilimitado.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1 dark:text-zinc-400">
              Características del Plan
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300 min-h-[80px]"
              placeholder="Ej: Turnos Online, Recordatorios WhatsApp, Soporte VIP"
              value={formData.featuresText}
              onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
            />
            <p className="text-[10px] text-zinc-400 mt-1 dark:text-zinc-500">
              Separa cada característica con una coma.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
