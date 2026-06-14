'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Calendar, Store, Users, LogOut, Menu, X, Scissors, User, UserCheck,
  Wallet, Package, Settings, ShoppingCart, CreditCard, AlertTriangle,
  CheckCircle2, Clock3, Bell, Percent, FileDown
} from 'lucide-react'

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
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserEmail(user.email ?? 'Empleado')
          const { data: profile } = await supabase
            .from('users')
            .select('role, first_name, last_name')
            .eq('id', user.id)
            .single()
          if (profile) {
            setRawRole(profile.role)
            setUserRole(
              profile.role === 'tenant_admin' ? 'Administrador'
              : profile.role === 'superadmin'  ? 'Superadmin'
              : 'Personal'
            )
            if (profile.first_name || profile.last_name) {
              setUserEmail(`${profile.first_name || ''} ${profile.last_name || ''}`.trim())
            } else {
              setUserEmail(user.email ?? 'Empleado')
            }
          }
        }

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
    if (tenantSlug) fetchTenantAndUser()
  }, [tenantSlug])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { name: 'Resumen',          href: `/${tenantSlug}/dashboard`,                    icon: Store,       moduleKey: 'statistics'       },
    { name: 'Agenda / Turnos',  href: `/${tenantSlug}/dashboard/agenda`,             icon: Calendar,    moduleKey: 'agenda'           },
    { name: 'Venta Mostrador',  href: `/${tenantSlug}/dashboard/ventas`,             icon: ShoppingCart,moduleKey: 'ventas_mostrador' },
    { name: 'Caja Diaria',      href: `/${tenantSlug}/dashboard/caja`,               icon: Wallet,      moduleKey: 'caja'             },
    { name: 'Inventario',       href: `/${tenantSlug}/dashboard/inventario`,         icon: Package,     moduleKey: 'inventario'       },
    { name: 'Clientes',         href: `/${tenantSlug}/dashboard/clientes`,           icon: UserCheck,   moduleKey: 'clientes'         },
    { name: 'Servicios',        href: `/${tenantSlug}/dashboard/servicios`,          icon: Scissors,    moduleKey: 'servicios'        },
    { name: 'Personal (Staff)', href: `/${tenantSlug}/dashboard/staff`,              icon: Users,       moduleKey: 'staff'            },
    { name: 'Comisiones',       href: `/${tenantSlug}/dashboard/comisiones`,         icon: Percent,     moduleKey: 'staff'            },
    { name: 'Reportes',         href: `/${tenantSlug}/dashboard/reportes`,           icon: FileDown,    moduleKey: 'statistics'       },
    { name: 'Recordatorios WA', href: `/${tenantSlug}/dashboard/recordatorios`,      icon: Bell,        moduleKey: 'whatsapp'         },
    { name: 'Configuración',    href: `/${tenantSlug}/dashboard/configuracion`,      icon: Settings,    moduleKey: 'configuracion'    },
    { name: 'Suscripción',      href: `/${tenantSlug}/dashboard/suscripcion`,        icon: CreditCard,  moduleKey: 'suscripcion'      },
  ]

  const filteredMenuItems = menuItems.filter(item => {
    if (item.moduleKey !== 'suscripcion' && enabledModules[item.moduleKey] === false) return false
    if (rawRole === 'staff') {
      return item.moduleKey === 'agenda' || item.moduleKey === 'clientes' || item.moduleKey === 'caja' || item.moduleKey === 'inventario' || item.moduleKey === 'ventas_mostrador'
    }
    return true
  })

  useEffect(() => {
    if (loading) return
    const pathParts = pathname.split('/').filter(Boolean)
    if (pathParts.length >= 2 && pathParts[1] === 'dashboard') {
      const subpath = pathParts[2]
      let currentKey = 'statistics'
      if (subpath === 'agenda')        currentKey = 'agenda'
      else if (subpath === 'ventas')   currentKey = 'ventas_mostrador'
      else if (subpath === 'clientes') currentKey = 'clientes'
      else if (subpath === 'servicios')currentKey = 'servicios'
      else if (subpath === 'staff')    currentKey = 'staff'
      else if (subpath === 'caja')     currentKey = 'caja'
      else if (subpath === 'inventario')    currentKey = 'inventario'
      else if (subpath === 'comisiones')    currentKey = 'staff'
      else if (subpath === 'reportes')      currentKey = 'statistics'
      else if (subpath === 'recordatorios') currentKey = 'whatsapp'
      else if (subpath === 'configuracion') currentKey = 'configuracion'
      else if (subpath === 'suscripcion')   currentKey = 'suscripcion'

      const isStaffForbidden = rawRole === 'staff' && (
        currentKey === 'statistics' || currentKey === 'servicios' ||
        currentKey === 'staff' || currentKey === 'configuracion' || currentKey === 'suscripcion'
      )

      if ((currentKey !== 'suscripcion' && enabledModules[currentKey] === false) || isStaffForbidden) {
        const fallback = menuItems.find(item => {
          if (enabledModules[item.moduleKey] === false) return false
          if (rawRole === 'staff') {
            return item.moduleKey === 'agenda' || item.moduleKey === 'clientes' || item.moduleKey === 'caja' || item.moduleKey === 'inventario'
          }
          return true
        })
        router.push(fallback ? fallback.href : '/login')
      }
    }
  }, [pathname, enabledModules, loading, rawRole])

  // ─── Sidebar content ──────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/8">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30 shrink-0">
          <Scissors className="w-4.5 h-4.5 text-emerald-400" />
        </div>
        <span className="font-bold text-white text-sm tracking-tight truncate max-w-[148px]">{tenantName}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== `/${tenantSlug}/dashboard` && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`nav-item-hover flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all border-l-2 ${
                isActive
                  ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400 sidebar-active-glow'
                  : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom: subscription + profile + logout */}
      <div className="px-3 pb-4 pt-3 border-t border-white/8 space-y-3">
        {/* Subscription badge */}
        {subscriptionBadge && rawRole !== 'staff' && (() => {
          const d = subscriptionBadge.daysRemaining
          const isGreen  = d >= 15
          const isYellow = d >= 7 && d < 15
          return (
            <Link
              href={`/${tenantSlug}/dashboard/suscripcion`}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all hover:brightness-110 cursor-pointer ${
                isGreen  ? 'bg-emerald-400/8 border-emerald-400/20'
                : isYellow ? 'bg-amber-400/8 border-amber-400/20'
                : 'bg-rose-400/8 border-rose-400/20 animate-pulse'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                isGreen  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]'
                : isYellow ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)] animate-pulse'
                : 'bg-rose-400 shadow-[0_0_6px_rgba(248,113,113,0.8)] animate-ping'
              }`} />
              <div className="flex flex-col min-w-0 flex-1">
                <span className={`text-[10px] font-bold uppercase tracking-wide truncate ${
                  isGreen  ? 'text-emerald-400'
                  : isYellow ? 'text-amber-400'
                  : 'text-rose-400'
                }`}>{subscriptionBadge.planName}</span>
                <span className={`text-[9px] font-medium ${
                  isGreen  ? 'text-emerald-400/70'
                  : isYellow ? 'text-amber-400/70'
                  : 'text-rose-400/70'
                }`}>
                  {d > 0 ? `${d} día${d !== 1 ? 's' : ''} restante${d !== 1 ? 's' : ''}` : '¡Vencida!'}
                </span>
              </div>
              {isGreen  && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              {isYellow && <Clock3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              {!isGreen && !isYellow && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
            </Link>
          )
        })()}

        {/* Profile */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="truncate flex flex-col min-w-0">
            <span className="truncate text-xs font-medium text-white max-w-[140px]">{userEmail}</span>
            <span className="text-[10px] text-emerald-400 font-semibold capitalize mt-0.5">{userRole}</span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="flex md:hidden items-center justify-between px-5 py-3 bg-slate-900 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/30">
            <Scissors className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">{tenantName}</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-white/8 flex flex-col transition-transform duration-300 ease-in-out`}
      >
        <SidebarContent />
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 p-6 md:p-10 flex flex-col w-full max-w-7xl mx-auto overflow-hidden">
        {children}
      </main>
    </div>
  )
}
