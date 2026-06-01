'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Calendar, Store, Users, LogOut, Menu, X, Scissors, User, UserCheck, Wallet, Package, Settings, ShoppingCart, CreditCard, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'

export default function TenantDashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tenantName, setTenantName] = useState<string>('Mi Comercio')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [rawRole, setRawRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscriptionBadge, setSubscriptionBadge] = useState<{
    daysRemaining: number
    planName: string
    status: string
    expirationDate: string | null
  } | null>(null)
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({
    agenda: true,
    servicios: true,
    staff: true,
    statistics: true,
    marketing: false,
    whatsapp: false,
    caja: false,
    inventario: false,
    ventas_mostrador: true
  })


  const tenantSlug = params.tenantSlug as string

  useEffect(() => {
    const fetchTenantAndUser = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        
        // Get current user details
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserEmail(user.email ?? 'Empleado')
          
          // Get user role & profile details
          const { data: profile } = await supabase
            .from('users')
            .select('role, first_name, last_name')
            .eq('id', user.id)
            .single()
          
          if (profile) {
            setRawRole(profile.role)
            setUserRole(
              profile.role === 'tenant_admin' 
                ? 'Administrador' 
                : profile.role === 'superadmin' 
                ? 'Superadmin' 
                : 'Personal'
            )
            if (profile.first_name || profile.last_name) {
              setUserEmail(`${profile.first_name || ''} ${profile.last_name || ''}`.trim())
            } else {
              setUserEmail(user.email ?? 'Empleado')
            }
          }
        }

        // Get tenant name, modules config, subscription info and plan
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name, enabled_modules, status, trial_ends_at, current_period_end, subscription_plans(name)')
          .eq('slug', tenantSlug)
          .single()
        
        if (tenant) {
          setTenantName(tenant.name)
          if (tenant.enabled_modules && typeof tenant.enabled_modules === 'object') {
            setEnabledModules(tenant.enabled_modules as Record<string, boolean>)
          }
          // Build subscription badge data
          const expirationStr = (tenant.status === 'trial' ? tenant.trial_ends_at : tenant.current_period_end) as string | null
          let daysRemaining = 0
          if (expirationStr) {
            const expDate = new Date(expirationStr)
            expDate.setHours(0, 0, 0, 0)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            daysRemaining = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          }
          setSubscriptionBadge({
            daysRemaining,
            planName: (tenant.subscription_plans as any)?.name || 'Sin plan',
            status: tenant.status,
            expirationDate: expirationStr
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (tenantSlug) {
      fetchTenantAndUser()
    }
  }, [tenantSlug])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { name: 'Resumen', href: `/${tenantSlug}/dashboard`, icon: Store, moduleKey: 'statistics' },
    { name: 'Agenda / Turnos', href: `/${tenantSlug}/dashboard/agenda`, icon: Calendar, moduleKey: 'agenda' },
    { name: 'Venta Mostrador', href: `/${tenantSlug}/dashboard/ventas`, icon: ShoppingCart, moduleKey: 'ventas_mostrador' },
    { name: 'Caja Diaria', href: `/${tenantSlug}/dashboard/caja`, icon: Wallet, moduleKey: 'caja' },
    { name: 'Inventario', href: `/${tenantSlug}/dashboard/inventario`, icon: Package, moduleKey: 'inventario' },
    { name: 'Clientes', href: `/${tenantSlug}/dashboard/clientes`, icon: UserCheck, moduleKey: 'clientes' },
    { name: 'Servicios', href: `/${tenantSlug}/dashboard/servicios`, icon: Scissors, moduleKey: 'servicios' },
    { name: 'Personal (Staff)', href: `/${tenantSlug}/dashboard/staff`, icon: Users, moduleKey: 'staff' },
    { name: 'Configuración', href: `/${tenantSlug}/dashboard/configuracion`, icon: Settings, moduleKey: 'configuracion' },
    { name: 'Suscripción', href: `/${tenantSlug}/dashboard/suscripcion`, icon: CreditCard, moduleKey: 'suscripcion' },
  ]

  const filteredMenuItems = menuItems.filter(item => {
    // 1. suscripcion always visible for admin/superadmin; other modules respect enabled_modules
    if (item.moduleKey !== 'suscripcion' && enabledModules[item.moduleKey] === false) return false

    // 2. Hide admin sections if user is staff
    if (rawRole === 'staff') {
      return item.moduleKey === 'agenda' || item.moduleKey === 'clientes' || item.moduleKey === 'caja' || item.moduleKey === 'inventario' || item.moduleKey === 'ventas_mostrador'
    }

    return true
  })

  // Redirection guard for disabled modules and role-based access
  useEffect(() => {
    if (loading) return

    const pathParts = pathname.split('/').filter(Boolean)
    // pathParts: [tenantSlug, 'dashboard', 'agenda']
    if (pathParts.length >= 2 && pathParts[1] === 'dashboard') {
      const subpath = pathParts[2] // undefined, 'agenda', 'servicios', 'staff', 'caja', 'inventario'
      
      let currentKey = 'statistics'
      if (subpath === 'agenda') currentKey = 'agenda'
      else if (subpath === 'ventas') currentKey = 'ventas_mostrador'
      else if (subpath === 'clientes') currentKey = 'clientes'
      else if (subpath === 'servicios') currentKey = 'servicios'
      else if (subpath === 'staff') currentKey = 'staff'
      else if (subpath === 'caja') currentKey = 'caja'
      else if (subpath === 'inventario') currentKey = 'inventario'
      else if (subpath === 'configuracion') currentKey = 'configuracion'
      else if (subpath === 'suscripcion') currentKey = 'suscripcion'

      const isStaffForbidden = rawRole === 'staff' && (currentKey === 'statistics' || currentKey === 'servicios' || currentKey === 'staff' || currentKey === 'configuracion' || currentKey === 'suscripcion')

      if ((currentKey !== 'suscripcion' && enabledModules[currentKey] === false) || isStaffForbidden) {
        // Find first enabled and allowed menu item to redirect to
        const fallback = menuItems.find(item => {
          if (enabledModules[item.moduleKey] === false) return false
          if (rawRole === 'staff') {
            return item.moduleKey === 'agenda' || item.moduleKey === 'clientes' || item.moduleKey === 'caja' || item.moduleKey === 'inventario'
          }
          return true
        })
        if (fallback) {
          router.push(fallback.href)
        } else {
          router.push('/login')
        }
      }
    }
  }, [pathname, enabledModules, loading, rawRole])

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white dark:bg-card-custom border-b border-border-custom">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-light text-primary rounded-lg">
            <Scissors className="w-5 h-5" />
          </div>
          <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm tracking-tight">{tenantName}</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-zinc-650 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 cursor-pointer"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-card-custom border-r border-border-custom flex flex-col justify-between transition-transform duration-300 ease-in-out`}
      >
        {/* Top Content */}
        <div className="flex flex-col flex-1 py-6 px-3">
          <div className="hidden md:flex items-center gap-2.5 px-3 mb-8">
            <div className="p-2 bg-primary-light text-primary rounded-lg">
              <Scissors className="w-5 h-5" />
            </div>
            <span className="font-bold text-zinc-900 dark:text-zinc-50 text-base tracking-tight truncate max-w-[160px]">{tenantName}</span>
          </div>

          <nav className="space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 border-l-4 ${
                    isActive
                      ? 'bg-primary-light text-primary border-primary dark:bg-primary-light dark:text-primary dark:border-primary'
                      : 'text-zinc-650 border-transparent hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Subscription Semáforo + Profile / Logout */}
        <div className="p-4 border-t border-border-custom space-y-3">
          {/* Subscription traffic-light widget – only visible to admin/superadmin */}
          {subscriptionBadge && rawRole !== 'staff' && (() => {
            const d = subscriptionBadge.daysRemaining
            const isGreen = d >= 15
            const isYellow = d >= 7 && d < 15
            return (
              <Link
                href={`/${tenantSlug}/dashboard/suscripcion`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all hover:brightness-95 cursor-pointer ${
                  isGreen
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40'
                    : isYellow
                    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40'
                    : 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 animate-pulse'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isGreen
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                    : isYellow
                    ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)] animate-pulse'
                    : 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-ping'
                }`} />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wide truncate ${
                    isGreen ? 'text-emerald-700 dark:text-emerald-400'
                    : isYellow ? 'text-amber-700 dark:text-amber-400'
                    : 'text-rose-700 dark:text-rose-400'
                  }`}>{subscriptionBadge.planName}</span>
                  <span className={`text-[9px] font-medium ${
                    isGreen ? 'text-emerald-600/80 dark:text-emerald-500'
                    : isYellow ? 'text-amber-600/80 dark:text-amber-500'
                    : 'text-rose-600/80 dark:text-rose-500'
                  }`}>
                    {d > 0 ? `${d} día${d !== 1 ? 's' : ''} restante${d !== 1 ? 's' : ''}` : '¡Vencida!'}
                  </span>
                </div>
                {isGreen && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                {isYellow && <Clock3 className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                {!isGreen && !isYellow && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
              </Link>
            )
          })()}

          <div className="flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-550 dark:text-zinc-400">
            <User className="w-4 h-4 shrink-0" />
            <div className="truncate flex flex-col">
              <span className="truncate max-w-[170px] font-medium">{userEmail}</span>
              <span className="text-[10px] text-primary dark:text-primary-hover font-bold capitalize mt-0.5">{userRole}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 flex flex-col w-full max-w-7xl mx-auto overflow-hidden">
        {children}
      </main>
    </div>
  )
}
