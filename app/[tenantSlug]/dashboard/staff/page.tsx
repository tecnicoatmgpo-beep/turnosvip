'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Plus, Edit2, Trash2, Search, Users, RefreshCw, XCircle, User, Phone, Mail, Heart, MapPin } from 'lucide-react'

interface StaffMember {
  id: string
  email: string
  role: 'tenant_admin' | 'staff' | 'superadmin' | 'customer'
  first_name: string | null
  last_name: string | null
  phone: string | null
  personal_email: string | null
  address: string | null
  locality: string | null
  province: string | null
  specialty: string | null
  created_at: string
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

export default function StaffPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string>('')
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)

  // Form inputs
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'staff' as StaffMember['role'],
    first_name: '',
    last_name: '',
    phone: '',
    personal_email: '',
    address: '',
    locality: 'Santa Rosa',
    province: 'La Pampa',
    specialty: ''
  })

  const supabase = createClient()

  // Clean and slugify tenant name to create email domain
  const computeDomain = () => {
    if (!tenantName) return 'comercio'
    return tenantName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, "")      // Keep only alphanumeric
  }

  const fetchStaff = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      // 1. Get Tenant Details
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('slug', tenantSlug)
        .single()

      if (!tenant) throw new Error('Comercio no encontrado')
      setTenantId(tenant.id)
      setTenantName(tenant.name)

      // 2. Fetch staff for this tenant
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, email, role, first_name, last_name, phone, personal_email, address, locality, province, specialty, created_at')
        .eq('tenant_id', tenant.id)
        .in('role', ['tenant_admin', 'staff'])
        .order('created_at')

      if (staffError) throw staffError
      setStaff((staffData || []) as StaffMember[])

      // 3. Get Current User Role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) {
          setCurrentUserRole(profile.role)
        }
      }
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
    setEditingStaff(null)
    setFormData({
      username: '',
      password: '',
      role: 'staff',
      first_name: '',
      last_name: '',
      phone: '',
      personal_email: '',
      address: '',
      locality: 'Santa Rosa',
      province: 'La Pampa',
      specialty: ''
    })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (member: StaffMember) => {
    setEditingStaff(member)
    // Extract username (part before @)
    const username = member.email.split('@')[0] || ''
    setFormData({
      username,
      password: '', // Optional when editing
      role: member.role,
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      phone: member.phone || '',
      personal_email: member.personal_email || '',
      address: member.address || '',
      locality: member.locality || 'Santa Rosa',
      province: member.province || 'La Pampa',
      specialty: member.specialty || ''
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

    if (!editingStaff && formData.password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (editingStaff && formData.password && formData.password.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    const cleanDomain = computeDomain()
    const loginEmail = `${formData.username.trim()}@${cleanDomain}.com`

    try {
      const url = editingStaff ? '/api/tenant/update-staff' : '/api/tenant/create-staff'
      const payload: any = {
        email: loginEmail,
        password: formData.password || null,
        role: formData.role,
        tenant_id: tenantId,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        personal_email: formData.personal_email.trim() || null,
        address: formData.address.trim(),
        locality: formData.locality.trim(),
        province: formData.province.trim(),
        specialty: formData.specialty.trim()
      }

      if (editingStaff) {
        payload.id = editingStaff.id
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar el empleado.')
      }

      setIsModalOpen(false)
      fetchStaff()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar empleado.')
    }
  }

  const filteredStaff = staff.filter(s => {
    const search = searchQuery.toLowerCase()
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase()
    return (
      s.email.toLowerCase().includes(search) ||
      fullName.includes(search) ||
      (s.specialty && s.specialty.toLowerCase().includes(search)) ||
      (s.phone && s.phone.includes(search))
    )
  })

  const roleLabels = {
    tenant_admin: 'Administrador de Salón',
    staff: 'Estilista / Personal',
    superadmin: 'Superadministrador',
    customer: 'Cliente',
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-white dark:bg-card-custom border border-border-custom rounded-lg animate-pulse" />
        <div className="h-40 bg-white dark:bg-card-custom border border-border-custom rounded-lg animate-pulse" />
      </div>
    )
  }

  // Double security check: Block non-admins
  if (currentUserRole && currentUserRole !== 'tenant_admin' && currentUserRole !== 'superadmin') {
    return (
      <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-16 text-center max-w-lg mx-auto">
        <XCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg">Acceso Denegado</h3>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">No tienes los permisos administrativos necesarios para acceder a esta sección.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Equipo de Trabajo (Staff)</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Administra los profesionales del salón, sus especialidades y sus cuentas de acceso.</p>
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
            placeholder="Buscar por nombre, especialidad o login..."
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
      {filteredStaff.length === 0 ? (
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
                  <th className="px-6 py-4">Profesional</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Usuario de Login</th>
                  <th className="px-6 py-4">Rol / Nivel</th>
                  <th className="px-6 py-4">Ubicación</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-sm">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-primary-light/20 dark:hover:bg-primary-light/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-light text-primary dark:bg-primary-light/25 dark:text-primary-hover flex items-center justify-center font-bold text-sm">
                          {((member.first_name?.[0] || '') + (member.last_name?.[0] || '')).toUpperCase() || 'P'}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            {member.first_name && member.last_name 
                              ? `${member.first_name} ${member.last_name}` 
                              : 'Sin perfil completo'}
                          </div>
                          {member.specialty && (
                            <div className="text-xs text-primary-accent font-semibold mt-0.5">
                              {member.specialty}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-700 dark:text-zinc-300 font-semibold">{member.phone || '-'}</div>
                      {member.personal_email && <div className="text-xs text-zinc-400 dark:text-zinc-500">{member.personal_email}</div>}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-650 dark:text-zinc-400 text-xs">
                      {member.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        member.role === 'tenant_admin'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-150 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
                      }`}>
                        {roleLabels[member.role] || member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500 dark:text-zinc-400">
                      {member.address ? (
                        <>
                          <div className="font-medium text-zinc-700 dark:text-zinc-300">{member.address}</div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">{member.locality}, {member.province}</div>
                        </>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(member)}
                        className="hover:border-primary hover:text-primary transition-all duration-150 cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
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

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStaff ? 'Editar Personal de Equipo' : 'Registrar Personal de Equipo'}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2 dark:bg-rose-950/20 dark:border-rose-950/30 dark:text-rose-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Personal Info */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              placeholder="Ej. Carlos"
              required
              size="sm"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
            <Input
              label="Apellido"
              placeholder="Ej. Gómez"
              required
              size="sm"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              placeholder="Ej. 2954 123456"
              required
              size="sm"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Correo electrónico de contacto (Opcional)"
              type="email"
              placeholder="Ej. carlos@personal.com"
              size="sm"
              value={formData.personal_email}
              onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Dirección"
              placeholder="Ej. Av. San Martín 123"
              required
              size="sm"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <Select
              label="Localidad"
              size="sm"
              options={LOCALIDADES_LA_PAMPA}
              value={formData.locality}
              onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
            />
            <Input
              label="Provincia"
              placeholder="Ej. La Pampa"
              required
              size="sm"
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Especialidad de Servicio"
              placeholder="Ej. Colorista, Manicura, Depiladora"
              required
              size="sm"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            />
            <Select
              label="Rol de Trabajo"
              size="sm"
              options={[
                { label: 'Estilista / Personal (Acceso restringido)', value: 'staff' },
                { label: 'Administrador de Salón (Acceso completo)', value: 'tenant_admin' },
              ]}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffMember['role'] })}
            />
          </div>

          <div className="border-t border-border-custom pt-4">
            <h4 className="text-xs font-bold text-primary mb-3 uppercase tracking-wider">Cuenta de Acceso (Login)</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-550 mb-1 dark:text-zinc-400 uppercase tracking-wide">
                  Usuario de Ingreso / Login
                </label>
                <div className="flex rounded-lg overflow-hidden border border-border-custom bg-white dark:bg-card-custom transition-all focus-within:ring-2 focus-within:ring-primary-accent focus-within:border-transparent">
                  <input
                    type="text"
                    placeholder="Ej. carlos.gomez"
                    required
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-transparent border-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                  />
                  <span className="inline-flex items-center px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-l border-border-custom text-zinc-505 text-xs font-semibold select-none">
                    @{computeDomain()}.com
                  </span>
                </div>
              </div>

              <Input
                label="Contraseña Temporal"
                type="password"
                placeholder={editingStaff ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
                required={!editingStaff}
                size="sm"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingStaff ? 'Guardar Cambios' : 'Registrar Personal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
