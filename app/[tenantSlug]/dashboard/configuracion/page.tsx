'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { 
  Settings, Save, Loader2, Store, Phone, Mail, MapPin, 
  FileText, Calendar, CheckCircle, AlertCircle 
} from 'lucide-react'

export default function ConfigurationPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [cuit, setCuit] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [activityStartDate, setActivityStartDate] = useState('')

  // Notifications
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const fetchTenantData = async () => {
      setLoading(true)
      setErrorMsg('')
      try {
        const supabase = createClient()
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select('id, name, address, cuit, phone, email, activity_start_date')
          .eq('slug', tenantSlug)
          .single()

        if (error) {
          if (error.message.includes('address') || error.message.includes('does not exist')) {
            console.warn('Columns do not exist in the tenants table. Please execute config_migration.sql.')
            
            const { data: basicTenant, error: basicError } = await supabase
              .from('tenants')
              .select('id, name')
              .eq('slug', tenantSlug)
              .single()

            if (basicError) throw basicError

            if (basicTenant) {
              setTenantId(basicTenant.id)
              setName(basicTenant.name || '')
              setErrorMsg('Falta ejecutar la migración SQL. Por favor, copia y ejecuta el archivo "config_migration.sql" en el panel SQL Editor de Supabase para poder configurar los datos adicionales.')
            }
          } else {
            throw error
          }
        } else if (tenant) {
          setTenantId(tenant.id)
          setName(tenant.name || '')
          setAddress(tenant.address || '')
          setCuit(tenant.cuit || '')
          setPhone(tenant.phone || '')
          setEmail(tenant.email || '')
          setActivityStartDate(tenant.activity_start_date || '')
        }
      } catch (err: any) {
        console.error('Error fetching tenant data:', err.message)
        setErrorMsg('Error al cargar la configuración del comercio.')
      } finally {
        setLoading(false)
      }
    }

    if (tenantSlug) {
      fetchTenantData()
    }
  }, [tenantSlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId) return

    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tenants')
        .update({
          name: name.trim(),
          address: address.trim() || null,
          cuit: cuit.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          activity_start_date: activityStartDate.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)

      if (error) {
        if (error.message.includes('address') || error.message.includes('does not exist')) {
          throw new Error('No se pueden guardar las configuraciones adicionales. Por favor, ejecuta la migración "config_migration.sql" en Supabase primero.')
        }
        throw error
      }

      setSuccessMsg('Configuración guardada correctamente.')
      // Refresh the page data
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      console.error('Error updating tenant:', err.message)
      setErrorMsg(err.message || 'Error al guardar los datos.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Cargando configuración del comercio...</span>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Configuración del Comercio
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configura la información comercial de tu negocio. Estos datos serán impresos automáticamente en los tickets de cobro.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-lg flex items-start gap-3 shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-500/30 text-rose-800 dark:text-rose-300 p-4 rounded-lg flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Main card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm space-y-6">
        <div className="border-b border-border-custom pb-4">
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Store className="w-4 h-4 text-zinc-500" />
            Datos de Identificación y Facturación
          </h2>
          <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5">
            Ingresa los datos fiscales y de marca que figuran en el ticket comercial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre Comercial"
            type="text"
            required
            placeholder="Ej: Bella Estética & Spa"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="CUIT (Identificación Tributaria)"
            type="text"
            placeholder="Ej: 20-35678901-9"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
          />

          <Input
            label="Fecha Inicio de Actividades"
            type="text"
            placeholder="Ej: 01/10/2024 o Octubre 2024"
            value={activityStartDate}
            onChange={(e) => setActivityStartDate(e.target.value)}
          />

          <Input
            label="Dirección Física"
            type="text"
            placeholder="Ej: Av. San Martín 1234, Santa Rosa"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="border-b border-border-custom pt-2 pb-4">
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Phone className="w-4 h-4 text-zinc-500" />
            Datos de Contacto
          </h2>
          <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5">
            Información complementaria que se mostrará como vía de consulta en el ticket.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Teléfono / Celular"
            type="text"
            placeholder="Ej: +54 2954 123456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="Ej: contacto@bellaestetica.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Footer info banner */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
          <FileText className="w-5 h-5 text-amber-600 dark:text-amber-550 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <span className="font-bold block mb-0.5">Nota Legal Importante:</span>
            De acuerdo con las regulaciones fiscales, todos los recibos impresos a través del sistema contarán de manera obligatoria con la leyenda descriptiva <strong>&quot;NO VALIDO COMO FACTURA&quot;</strong> al final del ticket.
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4 border-t border-border-custom">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            className="flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Configuración</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
