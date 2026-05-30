'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { LayoutDashboard, Store, CreditCard, LogOut, Shield, Menu, X, User } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setAdminEmail(user.email ?? 'Superadmin')
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { name: 'Inicio', href: '/admin', icon: LayoutDashboard },
    { name: 'Comercios (Tenants)', href: '/admin/tenants', icon: Store },
    { name: 'Suscripciones', href: '/admin/subscriptions', icon: CreditCard },
    { name: 'Cuentas y Personal', href: '/admin/users', icon: User },
  ]

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white dark:bg-card-custom border-b border-border-custom">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-light text-primary rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm tracking-tight">Mi Turno VIP</span>
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
            <div className="p-2 bg-primary-light text-primary rounded-lg dark:bg-primary-light">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-bold text-zinc-900 dark:text-zinc-50 text-base tracking-tight">Mi Turno VIP</span>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 border-l-4 ${
                    isActive
                      ? 'bg-primary-light text-primary border-primary dark:bg-primary-light dark:text-primary dark:border-primary'
                      : 'text-zinc-605 border-transparent hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom Profile / Logout */}
        <div className="p-4 border-t border-border-custom space-y-2">
          <div className="flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">{adminEmail}</span>
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
      <main className="flex-1 p-6 md:p-10 flex flex-col w-full max-w-7xl mx-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
