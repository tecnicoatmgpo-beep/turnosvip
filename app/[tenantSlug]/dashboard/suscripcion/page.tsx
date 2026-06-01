'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  CheckCircle2, Clock3, AlertTriangle, Zap, Crown, Star, Shield,
  Users, Calendar, Wallet, Package, ShoppingCart, BarChart2, Phone
} from 'lucide-react'

interface Plan {
  id: string
  name: string
  slug: string
  price: number
  billing_interval: string
  max_staff: number | null
  max_appointments_per_month: number | null
  features: string[]
}

interface TenantSub {
  planId: string | null
  planSlug: string | null
  planName: string | null
  status: string
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  daysRemaining: number
  subscriptionStatus: string
}

// Icon map per plan slug
const PLAN_ICONS: Record<string, React.ElementType> = {
  essential: Shield,
  basico: Shield,
  pro: Zap,
  vip: Crown,
}

// Color theme per plan slug
const PLAN_THEMES: Record<string, {
  border: string, badge: string, icon: string, glow: string, ring: string, bg: string
}> = {
  essential: {
    border: 'border-zinc-200 dark:border-zinc-700',
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    icon: 'text-zinc-500 dark:text-zinc-400',
    glow: '',
    ring: 'ring-zinc-300 dark:ring-zinc-600',
    bg: 'bg-white dark:bg-card-custom'
  },
  basico: {
    border: 'border-zinc-200 dark:border-zinc-700',
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    icon: 'text-zinc-500 dark:text-zinc-400',
    glow: '',
    ring: 'ring-zinc-300 dark:ring-zinc-600',
    bg: 'bg-white dark:bg-card-custom'
  },
  pro: {
    border: 'border-indigo-300 dark:border-indigo-700',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    icon: 'text-indigo-600 dark:text-indigo-400',
    glow: 'shadow-indigo-100 dark:shadow-indigo-950/30',
    ring: 'ring-indigo-300 dark:ring-indigo-700',
    bg: 'bg-white dark:bg-card-custom'
  },
  vip: {
    border: 'border-amber-300 dark:border-amber-700',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-amber-100 dark:shadow-amber-950/30',
    ring: 'ring-amber-400 dark:ring-amber-600',
    bg: 'bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/10 dark:to-card-custom'
  },
}

// Feature icon mapping
const FEATURE_ICONS: Record<string, React.ElementType> = {
  agenda: Calendar,
  caja: Wallet,
  inventario: Package,
  ventas: ShoppingCart,
  estadisticas: BarChart2,
  staff: Users,
  clientes: Users,
  whatsapp: Phone,
}

const getFeatureIcon = (feature: string) => {
  const lower = feature.toLowerCase()
  for (const [key, Icon] of Object.entries(FEATURE_ICONS)) {
    if (lower.includes(key)) return Icon
  }
  return CheckCircle2
}

// Superadmin WhatsApp number (update if needed)
const SUPERADMIN_WA = '5492954624125'

export default function SuscripcionPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [plans, setPlans] = useState<Plan[]>([])
  const [tenantSub, setTenantSub] = useState<TenantSub | null>(null)
  const [tenantName, setTenantName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const supabase = createClient()

      // Fetch all plans
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true })

      // Fetch tenant subscription info
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, status, plan_id, subscription_status, trial_ends_at, current_period_end, subscription_plans(id, name, slug)')
        .eq('slug', tenantSlug)
        .single()

      if (plansData) setPlans(plansData)

      if (tenant) {
        setTenantName(tenant.name)
        const expirationStr = (tenant.status === 'trial' ? tenant.trial_ends_at : tenant.current_period_end) as string | null
        let daysRemaining = 0
        if (expirationStr) {
          const expDate = new Date(expirationStr)
          expDate.setHours(0, 0, 0, 0)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          daysRemaining = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        }
        const planInfo = tenant.subscription_plans as any
        setTenantSub({
          planId: tenant.plan_id,
          planSlug: planInfo?.slug || null,
          planName: planInfo?.name || null,
          status: tenant.status,
          subscriptionStatus: tenant.subscription_status,
          trialEndsAt: tenant.trial_ends_at,
          currentPeriodEnd: tenant.current_period_end,
          daysRemaining
        })
      }

      setLoading(false)
    }
    if (tenantSlug) load()
  }, [tenantSlug])

  // Build WhatsApp URL for upgrade requests
  const buildWaUrl = (planName: string) => {
    const msg = encodeURIComponent(
      `¡Hola! Soy el administrador de *${tenantName}* y quiero solicitar información para actualizar mi plan a *${planName}*.\n\nActualmente estoy en el plan: ${tenantSub?.planName || 'Sin plan'}\n\n¡Muchas gracias!`
    )
    return `https://wa.me/${SUPERADMIN_WA}?text=${msg}`
  }

  // Status semáforo
  const renderSemaforo = () => {
    if (!tenantSub) return null
    const d = tenantSub.daysRemaining
    const isGreen = d >= 15
    const isYellow = d >= 7 && d < 15
    const isRed = d < 7

    const colors = isGreen
      ? { bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40', dot: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]', text: 'text-emerald-800 dark:text-emerald-300', sub: 'text-emerald-600 dark:text-emerald-400' }
      : isYellow
      ? { bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40', dot: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse', text: 'text-amber-800 dark:text-amber-300', sub: 'text-amber-600 dark:text-amber-400' }
      : { bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40', dot: 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.7)] animate-ping', text: 'text-rose-800 dark:text-rose-300', sub: 'text-rose-600 dark:text-rose-400' }

    const expiryDate = tenantSub.status === 'trial' ? tenantSub.trialEndsAt : tenantSub.currentPeriodEnd
    const expiryLabel = expiryDate ? new Date(expiryDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

    return (
      <div className={`flex items-center gap-4 p-5 rounded-2xl border ${colors.bg} shadow-xs`}>
        <div className="relative">
          <span className={`block w-5 h-5 rounded-full ${colors.dot}`} />
          {isRed && <span className="absolute inset-0 rounded-full bg-rose-500 opacity-40 animate-ping" />}
        </div>
        <div className="flex-1">
          <p className={`font-bold text-base ${colors.text}`}>
            {isGreen ? '✓ Suscripción Activa' : isYellow ? '⚠ Próximo Vencimiento' : '🚨 ¡Vencimiento Crítico!'}
          </p>
          <p className={`text-sm mt-0.5 ${colors.sub}`}>
            {tenantSub.status === 'trial' ? 'Período de prueba · ' : ''}
            {d > 0
              ? `Vence el ${expiryLabel} — quedan ${d} día${d !== 1 ? 's' : ''}`
              : `¡La suscripción venció el ${expiryLabel}!`}
          </p>
        </div>
        <div>
          {isGreen && <CheckCircle2 className="w-7 h-7 text-emerald-500" />}
          {isYellow && <Clock3 className="w-7 h-7 text-amber-500" />}
          {isRed && <AlertTriangle className="w-7 h-7 text-rose-500" />}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-72 bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Suscripción</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          Estado de tu plan y opciones disponibles para {tenantName}.
        </p>
      </div>

      {/* Semáforo de suscripción */}
      {renderSemaforo()}

      {/* Plans grid */}
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">Planes Disponibles</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
          Tu plan actual está resaltado. Para cambiar de plan, contactanos por WhatsApp.
        </p>

        <div className={`grid gap-6 ${plans.length <= 2 ? 'md:grid-cols-2' : plans.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
          {plans.map(plan => {
            const isCurrentPlan = tenantSub?.planId === plan.id
            const theme = PLAN_THEMES[plan.slug] || PLAN_THEMES.essential
            const PlanIcon = PLAN_ICONS[plan.slug] || Star
            const features: string[] = Array.isArray(plan.features) ? plan.features : []

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl border-2 shadow-md transition-all duration-300 ${theme.bg} ${
                  isCurrentPlan
                    ? `${theme.border} ring-4 ${theme.ring} ring-offset-2 dark:ring-offset-zinc-900 scale-[1.02] shadow-xl ${theme.glow}`
                    : 'border-border-custom hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-lg'
                }`}
              >
                {/* Current plan ribbon */}
                {isCurrentPlan && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest shadow-sm ${theme.badge}`}>
                    ★ Tu plan actual
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1">
                  {/* Plan header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 ${theme.icon}`}>
                      <PlanIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-50 leading-tight">{plan.name}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.badge} px-2 py-0.5 rounded-full`}>
                        {plan.slug}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                        ${Number(plan.price).toLocaleString('es-AR')}
                      </span>
                      <span className="text-sm text-zinc-400 dark:text-zinc-500 mb-1.5">
                        /{plan.billing_interval === 'month' ? 'mes' : plan.billing_interval}
                      </span>
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="flex flex-col gap-2 mb-5">
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <Users className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span>
                        {plan.max_staff !== null
                          ? `Hasta ${plan.max_staff} staff`
                          : 'Staff ilimitado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span>
                        {plan.max_appointments_per_month !== null
                          ? `Hasta ${plan.max_appointments_per_month.toLocaleString('es-AR')} turnos/mes`
                          : 'Turnos ilimitados'}
                      </span>
                    </div>
                  </div>

                  {/* Features list */}
                  {features.length > 0 && (
                    <ul className="space-y-2 flex-1 mb-6">
                      {features.map((feat, i) => {
                        const FeatIcon = getFeatureIcon(feat)
                        return (
                          <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                            <FeatIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isCurrentPlan ? theme.icon : 'text-primary'}`} />
                            <span>{feat}</span>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {/* CTA */}
                  <div className="mt-auto pt-4">
                    {isCurrentPlan ? (
                      <div className={`w-full text-center py-2.5 rounded-xl text-xs font-bold border ${theme.badge} ${theme.border}`}>
                        ✓ Plan Activo
                      </div>
                    ) : (
                      <a
                        href={buildWaUrl(plan.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bc5a] text-white font-bold text-xs transition-all shadow hover:shadow-md hover:-translate-y-0.5"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        Solicitar este plan
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Info footer */}
      <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-border-custom rounded-2xl text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-3">
        <Star className="w-4 h-4 shrink-0 text-primary mt-0.5" />
        <p>
          Para cambiar de plan, renovar tu suscripción o solicitar información adicional, hacé clic en el botón de WhatsApp del plan deseado.
          Un representante te atenderá a la brevedad.
        </p>
      </div>
    </div>
  )
}
