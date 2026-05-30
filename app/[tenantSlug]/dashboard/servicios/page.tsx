'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Plus, Edit2, Trash2, Search, Scissors, RefreshCw, XCircle } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  category: string | null
  tenant_id: string
}

const AESTHETIC_CATEGORIES = [
  { label: 'Facial (Tratamientos Faciales)', value: 'Facial' },
  { label: 'Corporal (Tratamientos Corporales)', value: 'Corporal' },
  { label: 'Depilación (Láser / Definitiva)', value: 'Depilación' },
  { label: 'Manicuría & Pedicuría', value: 'Manicuría' },
  { label: 'Cejas & Pestañas', value: 'Cejas y Pestañas' },
  { label: 'Peluquería & Peinados', value: 'Peluquería' },
  { label: 'Masajes & Bienestar', value: 'Masajes' },
  { label: 'Maquillaje Profesional', value: 'Maquillaje' },
  { label: 'Medicina Estética', value: 'Medicina Estética' },
  { label: 'Otros / General', value: 'General' }
]

export default function ServicesPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: '30',
    price: '0.00',
    category: 'Facial',
  })

  const supabase = createClient()

  const fetchServices = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      // 1. Get Tenant ID from Slug
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single()

      if (!tenant) throw new Error('Comercio no encontrado')
      setTenantId(tenant.id)

      // 2. Fetch services for this tenant
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('name')

      if (servicesError) throw servicesError
      setServices(servicesData || [])
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error al obtener servicios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tenantSlug) {
      fetchServices()
    }
  }, [tenantSlug])

  const handleOpenAddModal = () => {
    setEditingService(null)
    setFormData({
      name: '',
      description: '',
      duration_minutes: '30',
      price: '0.00',
      category: 'Facial',
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes.toString(),
      price: service.price.toString(),
      category: service.category || 'Facial',
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este servicio?')) return
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)

      if (error) throw error
      setServices(prev => prev.filter(s => s.id !== serviceId))
    } catch (err: any) {
      alert(err.message || 'Error al eliminar servicio.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!tenantId) {
      setErrorMsg('Error de contexto del comercio.')
      return
    }

    const payload = {
      tenant_id: tenantId,
      name: formData.name,
      description: formData.description || null,
      duration_minutes: parseInt(formData.duration_minutes, 10) || 30,
      price: parseFloat(formData.price) || 0.00,
      category: formData.category || null,
    }

    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editingService.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('services')
          .insert([payload])

        if (error) throw error
      }

      setIsModalOpen(false)
      fetchServices()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el servicio.')
    }
  }

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Catálogo de Servicios</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Configura las opciones, precios y duraciones de los tratamientos o cortes disponibles.</p>
        </div>
        <Button onClick={handleOpenAddModal} className="shrink-0 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Agregar Servicio
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o categoría..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-card-custom border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-accent dark:text-zinc-50 placeholder-zinc-400 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="md" onClick={fetchServices} className="p-2.5 cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Services List Table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-white dark:bg-card-custom border border-border-custom rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-12 text-center">
          <Scissors className="w-12 h-12 text-primary/40 mx-auto mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">No se encontraron servicios</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Registra los tratamientos de tu salón para ofrecerlos al agendar citas.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-zinc-50/50 dark:bg-primary-light/10 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Servicio</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Duración</th>
                  <th className="px-6 py-4">Precio (ARS)</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-sm">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-primary-light/20 dark:hover:bg-primary-light/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{service.name}</div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 line-clamp-1">{service.description || 'Sin descripción'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-350 capitalize border border-transparent">
                        {service.category || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-705 dark:text-zinc-305 font-medium">
                      {service.duration_minutes} min
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">
                      ${Number(service.price).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(service)}
                        className="hover:border-primary hover:text-primary transition-all duration-150 cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteService(service.id)}
                        className="border-rose-250 text-rose-600 dark:border-rose-900/40 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
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

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Input
            label="Nombre del Servicio"
            placeholder="Ej. Corte de Cabello + Lavado"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1 dark:text-zinc-400 uppercase tracking-wide">
              Descripción
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm bg-white dark:bg-card-custom border border-border-custom rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-accent min-h-[80px]"
              placeholder="Ej. Incluye lavado con shampoo premium y peinado final."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duración (Minutos)"
              type="number"
              required
              min="1"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
            />
            <Input
              label="Precio (ARS)"
              type="number"
              step="0.01"
              required
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          <Select
            label="Categoría"
            options={AESTHETIC_CATEGORIES}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingService ? 'Guardar Cambios' : 'Agregar Servicio'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
