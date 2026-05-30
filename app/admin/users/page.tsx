'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Edit2, ShieldAlert, User, Search, Store, KeyRound, AlertTriangle } from 'lucide-react'

interface Tenant {
  id: string
  name: string
}

interface UserProfile {
  id: string
  email: string
  role: 'superadmin' | 'tenant_admin' | 'staff' | 'customer'
  tenant_id: string | null
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterTenant, setFilterTenant] = useState('all')
  
  // Current logged in user to prevent self-demoting
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState<'superadmin' | 'tenant_admin' | 'staff' | 'customer'>('staff')
  const [editTenantId, setEditTenantId] = useState<string>('none')
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPersonalEmail, setEditPersonalEmail] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editLocality, setEditLocality] = useState('')
  const [editProvince, setEditProvince] = useState('')
  const [editSpecialty, setEditSpecialty] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      // Get current logged-in user
      const { data: { user: currUser } } = await supabase.auth.getUser()
      if (currUser) {
        setCurrentUserId(currUser.id)
      }

      // Fetch tenants
      const { data: tenantsData, error: tenantsErr } = await supabase
        .from('tenants')
        .select('id, name')
        .order('name', { ascending: true })
      
      if (tenantsErr) throw tenantsErr
      setTenants(tenantsData || [])

      // Fetch users
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersErr) throw usersErr
      setUsers(usersData || [])
    } catch (error: any) {
      console.error('Error fetching data:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEditModal = (user: UserProfile) => {
    setEditingUser(user)
    setEditEmail(user.email || '')
    setEditPassword('')
    setEditRole(user.role)
    setEditTenantId(user.tenant_id || 'none')
    setEditFirstName(user.first_name || '')
    setEditLastName(user.last_name || '')
    setEditPhone(user.phone || '')
    setEditPersonalEmail(user.personal_email || '')
    setEditAddress(user.address || '')
    setEditLocality(user.locality || '')
    setEditProvince(user.province || 'La Pampa')
    setEditSpecialty(user.specialty || '')
    
    setModalError('')
    setModalSuccess('')
    setModalLoading(false)
    setEditModalOpen(true)
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setModalLoading(true)
    setModalError('')
    setModalSuccess('')

    try {
      const payload = {
        id: editingUser.id,
        email: editEmail,
        password: editPassword || undefined,
        role: editRole,
        tenant_id: editTenantId === 'none' ? null : editTenantId,
        first_name: editFirstName,
        last_name: editLastName,
        phone: editPhone,
        personal_email: editPersonalEmail || null,
        address: editAddress,
        locality: editLocality,
        province: editProvince,
        specialty: editSpecialty
      }

      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar usuario')
      }

      setModalSuccess('Usuario actualizado con éxito.')
      await fetchInitialData()
      setTimeout(() => {
        setEditModalOpen(false)
      }, 1500)
    } catch (error: any) {
      setModalError(error.message || 'Ocurrió un error inesperado.')
    } finally {
      setModalLoading(false)
    }
  }

  // Filtering
  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
    const email = (u.email || '').toLowerCase()
    const searchMatch = fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase())
    
    const roleMatch = filterRole === 'all' || u.role === filterRole
    const tenantMatch = filterTenant === 'all' || u.tenant_id === filterTenant

    return searchMatch && roleMatch && tenantMatch
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400">Superadmin</span>
      case 'tenant_admin':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-violet-100 text-violet-800 dark:bg-violet-950/30 dark:text-violet-400">Admin Comercio</span>
      case 'staff':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">Staff / Profesional</span>
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">Cliente</span>
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Control de Cuentas y Credenciales
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Módulo de superadministración para editar perfiles de personal, corregir correos electrónicos y restablecer contraseñas de cualquier usuario.
        </p>
      </div>

      {/* Warning Box */}
      <div className="flex items-start gap-4 p-4 rounded-xl border border-rose-200 dark:border-rose-950/50 bg-rose-50/50 dark:bg-rose-950/10">
        <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-450 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-rose-800 dark:text-rose-400 text-sm">Privilegios Administrativos Elevados</h3>
          <p className="text-rose-700 dark:text-rose-350 text-xs mt-1">
            Como superadministrador, puedes cambiar la contraseña y el correo electrónico de acceso de cualquier persona directamente en el sistema. Asegúrate de verificar la identidad del personal antes de realizar cambios de credenciales.
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="p-6 bg-white dark:bg-card-custom border border-border-custom rounded-xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400">
              <Search className="w-4 h-4" />
            </span>
            <Input
              type="text"
              placeholder="Buscar por nombre, apellido o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div>
            <Select 
              value={filterRole} 
              onChange={(e) => setFilterRole(e.target.value)}
              options={[
                { label: 'Todos los Roles', value: 'all' },
                { label: 'Superadmins', value: 'superadmin' },
                { label: 'Admin Comercio', value: 'tenant_admin' },
                { label: 'Staff / Personal', value: 'staff' },
                { label: 'Clientes', value: 'customer' }
              ]}
            />
          </div>

          <div>
            <Select 
              value={filterTenant} 
              onChange={(e) => setFilterTenant(e.target.value)}
              options={[
                { label: 'Todos los Comercios', value: 'all' },
                ...tenants.map((t) => ({ label: t.name, value: t.id }))
              ]}
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-border-custom">
                <th className="px-6 py-4 font-semibold text-zinc-650 dark:text-zinc-400">Usuario</th>
                <th className="px-6 py-4 font-semibold text-zinc-650 dark:text-zinc-400 font-mono">ID / Email</th>
                <th className="px-6 py-4 font-semibold text-zinc-650 dark:text-zinc-400">Rol</th>
                <th className="px-6 py-4 font-semibold text-zinc-650 dark:text-zinc-400">Comercio Asignado</th>
                <th className="px-6 py-4 font-semibold text-zinc-650 dark:text-zinc-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-450 dark:text-zinc-500">
                    Cargando listado de usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-450 dark:text-zinc-500">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userTenant = tenants.find((t) => t.id === user.tenant_id)
                  const hasProfileName = user.first_name || user.last_name
                  const nameText = hasProfileName 
                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                    : 'Sin Perfil Completado'

                  return (
                    <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-350">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{nameText}</div>
                            {user.specialty && (
                              <div className="text-xs text-primary dark:text-primary-hover font-medium">
                                Esp: {user.specialty}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-zinc-800 dark:text-zinc-200 font-medium">{user.email}</div>
                        <div className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{user.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4">
                        {userTenant ? (
                          <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-350">
                            <Store className="w-3.5 h-3.5" />
                            <span className="font-medium">{userTenant.name}</span>
                          </div>
                        ) : user.role === 'superadmin' ? (
                          <span className="text-zinc-400 dark:text-zinc-500 italic">Acceso Global</span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500 italic">Ninguno</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditModal(user)}
                          className="inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Editar Usuario: ${editingUser?.email || ''}`}
        size="2xl"
      >
        <form onSubmit={handleSaveUser} className="space-y-6">
          {/* Main error or success states */}
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
              {modalError}
            </div>
          )}
          {modalSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-lg text-emerald-700 text-xs font-semibold">
              {modalSuccess}
            </div>
          )}

          {/* Section: Credentials */}
          <div className="space-y-4">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-50 border-b border-border-custom pb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Credenciales de Inicio de Sesión</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Correo Electrónico de Acceso</label>
                <Input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350 flex items-center gap-1">
                  <span>Nueva Contraseña</span>
                  <span className="text-zinc-400 dark:text-zinc-500 font-normal">(dejar en blanco para mantener)</span>
                </label>
                <Input
                  type="password"
                  placeholder="Min. 6 caracteres"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Rol de Usuario</label>
                <Select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  disabled={editingUser?.id === currentUserId} // Prevent self demoting
                  options={[
                    { label: 'Superadministrador', value: 'superadmin' },
                    { label: 'Administrador de Comercio', value: 'tenant_admin' },
                    { label: 'Personal / Staff', value: 'staff' },
                    { label: 'Cliente', value: 'customer' }
                  ]}
                />
                {editingUser?.id === currentUserId && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-450 block mt-1">
                    No puedes cambiar tu propio rol de Superadministrador para evitar perder acceso.
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Comercio Vinculado</label>
                <Select
                  value={editTenantId}
                  onChange={(e) => setEditTenantId(e.target.value)}
                  disabled={editRole === 'superadmin' || editingUser?.id === currentUserId}
                  options={[
                    { label: 'Ninguno (Acceso Global o Sin Comercio)', value: 'none' },
                    ...tenants.map((t) => ({ label: t.name, value: t.id }))
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Section: Profile info */}
          <div className="space-y-4">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-50 border-b border-border-custom pb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Información de Perfil / Personal</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Nombre</label>
                <Input
                  type="text"
                  placeholder="Ej: Carina"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Apellido</label>
                <Input
                  type="text"
                  placeholder="Ej: Cremaschi"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Celular / Teléfono</label>
                <Input
                  type="text"
                  placeholder="Ej: 2302468128"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Especialidad de Servicio</label>
                <Input
                  type="text"
                  placeholder="Ej: Manicurista, Peluquero"
                  value={editSpecialty}
                  onChange={(e) => setEditSpecialty(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Dirección</label>
                <Input
                  type="text"
                  placeholder="Ej: Calle 23 832"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Correo Personal (Opcional)</label>
                <Input
                  type="email"
                  placeholder="Ej: carina@gmail.com"
                  value={editPersonalEmail}
                  onChange={(e) => setEditPersonalEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Localidad</label>
                <Input
                  type="text"
                  placeholder="Ej: General Pico"
                  value={editLocality}
                  onChange={(e) => setEditLocality(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Provincia</label>
                <Select
                  value={editProvince}
                  onChange={(e) => setEditProvince(e.target.value)}
                  options={[
                    { label: 'La Pampa', value: 'La Pampa' },
                    { label: 'Buenos Aires', value: 'Buenos Aires' },
                    { label: 'Córdoba', value: 'Córdoba' },
                    { label: 'Mendoza', value: 'Mendoza' },
                    { label: 'San Luis', value: 'San Luis' },
                    { label: 'Santa Fe', value: 'Santa Fe' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Alert */}
          <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Atención:</strong> Si modificas el correo de acceso o la contraseña, el usuario deberá utilizar estas nuevas credenciales en su próximo ingreso. Los cambios se guardan inmediatamente tanto en el sistema de autenticación como en la base de datos pública.
            </span>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={modalLoading}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={modalLoading}
              className="cursor-pointer"
            >
              {modalLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
