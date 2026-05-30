'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Plus, Trash2, Search, Users, RefreshCw, XCircle } from 'lucide-react'

interface StaffMember {
  id: string
  email: string
  role: 'tenant_admin' | 'staff' | 'superadmin' | 'customer'
  created_at: string
}

export default function StaffPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form inputs
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'staff' as StaffMember['role'],
  })

  const supabase = createClient()

  const fetchStaff = async () => {
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

      // 2. Fetch staff for this tenant
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .eq('tenant_id', tenant.id)
        .in('role', ['tenant_admin', 'staff'])
        .order('created_at')

      if (staffError) throw staffError
      setStaff(staffData || [])
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error al obtener personal.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tenantSlug) {
      fetchStaff()
    }
  }, [tenantSlug])

  const handleOpenAddModal = () => {
    setFormData({
      email: '',
      password: '',
      role: 'staff',
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este empleado? Se borrará su cuenta de acceso.')) return
    try {
      const response = await fetch(`/api/tenant/delete-staff?id=${staffId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar el empleado.')
      }

      setStaff(prev => prev.filter(s => s.id !== staffId))
    } catch (err: any) {
      alert(err.message || 'Error al eliminar empleado.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!tenantId) {
      setErrorMsg('Error de contexto del comercio.')
      return
    }

    if (formData.password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    try {
      const response = await fetch('/api/tenant/create-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          tenant_id: tenantId,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al registrar el empleado.')
      }

      setIsModalOpen(false)
      fetchStaff()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar empleado.')
    }
  }

  const filteredStaff = staff.filter(s => 
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const roleLabels = {
    tenant_admin: 'Administrador de Salón',
    staff: 'Estilista / Personal',
    superadmin: 'Superadministrador',
    customer: 'Cliente',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Equipo de Trabajo (Staff)</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Administra los profesionales del salón y sus niveles de acceso al panel.</p>
        </div>
        <Button onClick={handleOpenAddModal} className="shrink-0 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Registrar Personal
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por correo electrónico..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-card-custom border border-border-custom rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-accent dark:text-zinc-50 placeholder-zinc-400 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="md" onClick={fetchStaff} className="p-2.5 cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Staff list table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-white dark:bg-card-custom border border-border-custom rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-primary/40 mx-auto mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">No se encontraron empleados</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Registra profesionales del equipo para asignarles turnos de trabajo.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-zinc-50/50 dark:bg-primary-light/10 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Correo Electrónico</th>
                  <th className="px-6 py-4">Rol / Nivel de Acceso</th>
                  <th className="px-6 py-4">Fecha de Alta</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-sm">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-primary-light/20 dark:hover:bg-primary-light/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                      {member.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        member.role === 'tenant_admin'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400'
                      }`}>
                        {roleLabels[member.role] || member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteStaff(member.id)}
                        className="border-rose-250 text-rose-600 dark:border-rose-900/40 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Personal de Equipo"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Input
            label="Correo electrónico del Empleado"
            type="email"
            placeholder="ejemplo@salon.com"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label="Contraseña Temporal"
            type="password"
            placeholder="Mínimo 6 caracteres"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <Select
            label="Rol de Trabajo"
            options={[
              { label: 'Estilista / Personal (Acceso restringido)', value: 'staff' },
              { label: 'Administrador de Salón (Acceso completo)', value: 'tenant_admin' },
            ]}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffMember['role'] })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Registrar Personal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
