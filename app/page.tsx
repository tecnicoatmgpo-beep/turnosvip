'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { 
  Calendar, 
  Search, 
  Wallet, 
  Package, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  Smartphone,
  Check,
  Scissors,
  ArrowRight,
  Sparkles
} from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
}

export default function LandingPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTenants = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('status', 'trial') // include both trial and active
      
      const { data: activeData } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('status', 'active')

      const combined = [...(data || []), ...(activeData || [])]
      // Remove duplicates
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)

      setTenants(unique)
      setLoading(false)
    }
    fetchTenants()
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const targetSlug = selectedTenant || searchQuery.trim().toLowerCase()
    if (targetSlug) {
      router.push(`/${targetSlug}`)
    }
  }

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const plans = [
    {
      name: 'Plan Básico',
      price: '$18.000',
      description: 'Ideal para profesionales independientes que inician.',
      features: [
        '1 Profesional / Agenda',
        'Hasta 150 turnos al mes',
        'Recordatorios de Turnos por Email',
        'Soporte Técnico por Email',
        'Fichas de clientes básicas'
      ],
      whatsappText: 'Hola! Quiero solicitar el Plan Básico de Mi Turno VIP para mi comercio.',
      popular: false
    },
    {
      name: 'Plan Profesional (Pro)',
      price: '$38.000',
      description: 'Perfecto para salones y equipos en crecimiento.',
      features: [
        'Hasta 5 Profesionales / Agendas',
        'Hasta 800 turnos al mes',
        'Recordatorios automáticos por WhatsApp',
        'Control de Caja Diaria y Gastos',
        'Historial Clínico y Fichas de Clientes',
        'Soporte Prioritario 24/7'
      ],
      whatsappText: 'Hola! Quiero solicitar el Plan Profesional (Pro) de Mi Turno VIP para mi comercio.',
      popular: true
    },
    {
      name: 'Plan Elite (Premium)',
      price: '$52.000',
      description: 'Para comercios consolidados con altas exigencias.',
      features: [
        'Agendas y Profesionales Ilimitados',
        'Hasta 2000 turnos al mes',
        'Recordatorios de WhatsApp ilimitados',
        'Reportes y Estadísticas Avanzadas',
        'Gestión de Stock de Productos (Inventario)',
        'Módulo POS Ventas de Mostrador',
        'Soporte y Asesoramiento VIP'
      ],
      whatsappText: 'Hola! Quiero solicitar el Plan Elite (Premium) de Mi Turno VIP para mi comercio.',
      popular: false
    }
  ]

  const features = [
    {
      icon: Calendar,
      title: 'Agenda Interactiva',
      desc: 'Agenda digital rápida y fácil. Controla tus citas diarias y semanales con vistas premium optimizadas.'
    },
    {
      icon: Wallet,
      title: 'Control de Caja Diaria',
      desc: 'Gestiona ingresos, gastos y arqueos diarios. Evita discrepancias y lleva la contabilidad al día.'
    },
    {
      icon: Package,
      title: 'Inventario de Productos',
      desc: 'Lleva el stock de tus productos de reventa. Registra salidas, entradas y alertas de stock mínimo.'
    },
    {
      icon: TrendingUp,
      title: 'Ventas de Mostrador (POS)',
      desc: 'Módulo POS integrado para vender productos, aplicar descuentos automáticos y emitir tickets de pago.'
    },
    {
      icon: Users,
      title: 'Gestión de Profesionales',
      desc: 'Configura horarios de trabajo, especialidades y accesos independientes para cada miembro de tu equipo.'
    },
    {
      icon: Smartphone,
      title: 'Reserva Online 24/7',
      desc: 'Tu propio link público para que tus clientes agenden directamente desde Instagram, WhatsApp o Web.'
    }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      
      {/* GLOW DE FONDO AMBIENTAL */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 dark:bg-primary/5"></div>
      <div className="absolute top-[800px] right-1/4 w-[600px] h-[600px] bg-primary-accent/10 rounded-full blur-[150px] pointer-events-none -z-10 dark:bg-primary-accent/5"></div>

      {/* HEADER NAVBAR */}
      <header className="border-b border-border-custom backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20">
              <Scissors className="w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              MI TURNO <span className="text-primary font-black">VIP</span>
            </span>
          </div>

          <nav className="flex items-center gap-6">
            <a href="#caracteristicas" className="text-sm font-semibold hover:text-primary transition-colors text-zinc-650 dark:text-zinc-300">
              Características
            </a>
            <a href="#planes" className="text-sm font-semibold hover:text-primary transition-colors text-zinc-650 dark:text-zinc-300">
              Planes
            </a>
            <Button 
              onClick={() => router.push('/login')} 
              variant="outline" 
              size="sm"
              className="text-xs font-bold border-zinc-200 text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100"
            >
              Acceso Comercios
            </Button>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* TEXTO HERO */}
        <div className="lg:col-span-7 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistema Profesional de Gestión y Reservas</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
            Llevá la gestión de tu <span className="bg-gradient-to-r from-primary to-primary-accent bg-clip-text text-transparent">comercio</span> al siguiente nivel
          </h1>

          <p className="text-base sm:text-lg text-zinc-550 dark:text-zinc-400 max-w-xl leading-relaxed">
            Simplificá la reserva de turnos para tus clientes, controlá tu caja diaria, administrá tu inventario y gestioná a tus profesionales en una sola plataforma premium.
          </p>

          {/* BUSCADOR DE RESERVAS ONLINE */}
          <div className="bg-white dark:bg-card-custom border border-border-custom rounded-3xl p-6 shadow-xl max-w-lg space-y-4">
            <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>¿Querés reservar un turno online?</span>
            </h3>
            
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <select
                  value={selectedTenant}
                  onChange={(e) => {
                    setSelectedTenant(e.target.value)
                    setSearchQuery(e.target.value)
                  }}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-zinc-50 border border-border-custom rounded-xl text-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-zinc-900 dark:text-zinc-100 transition-all cursor-pointer"
                >
                  <option value="">-- Elige el comercio para tu reserva --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.slug}>{t.name}</option>
                  ))}
                </select>
              </div>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary-accent text-white font-bold text-xs shrink-0 py-2.5"
                disabled={!selectedTenant}
              >
                <span>Reservar Online</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </form>
          </div>
        </div>

        {/* MOCKUP VISUAL DUMMY PREMIUM (SVG/CSS STACKED CARDS) */}
        <div className="lg:col-span-5 relative hidden lg:block">
          <div className="w-[400px] h-[300px] bg-gradient-to-br from-primary/20 to-primary-accent/15 rounded-3xl border border-primary/20 absolute -top-10 -left-6 transform -rotate-6 blur-xs"></div>
          
          {/* Tarjeta 1: Agenda */}
          <div className="w-[360px] bg-white dark:bg-card-custom border border-border-custom rounded-2xl p-5 shadow-2xl relative z-20 hover-lift">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">Próximas Citas</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-bold">HOY</span>
            </div>
            <div className="space-y-2.5">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl flex items-center justify-between border border-border-custom/50">
                <div>
                  <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">Fernando Paoli</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Corte caballero + lavado</p>
                </div>
                <span className="text-xs font-black text-primary">16:30 h</span>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl flex items-center justify-between border border-border-custom/50">
                <div>
                  <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">María Delgado</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Color completo + peinado</p>
                </div>
                <span className="text-xs font-black text-primary">18:00 h</span>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Caja Financiera */}
          <div className="w-[280px] bg-zinc-900 dark:bg-zinc-950 text-white rounded-2xl p-5 shadow-2xl absolute -bottom-16 -right-6 z-30 hover-lift border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Caja Diario</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400">Total Ingresos</span>
              <p className="text-2xl font-black text-emerald-400">$ 48.725,00</p>
            </div>
            <div className="flex items-center gap-2 mt-4 text-[9px] text-zinc-400 font-bold bg-zinc-800/40 p-2 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
              <span>Sesión Cuadrada</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN CARACTERÍSTICAS */}
      <section id="caracteristicas" className="py-24 border-t border-border-custom bg-zinc-50/50 dark:bg-zinc-950/20 relative">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              Una suite de herramientas completa
            </h2>
            <p className="text-sm sm:text-base text-zinc-550 dark:text-zinc-450 leading-relaxed">
              Diseñado minuciosamente para agilizar las tareas cotidianas de tu comercio y permitirte enfocar tu energía en lo que de verdad importa: tus clientes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, idx) => {
              const IconComp = feat.icon
              return (
                <div key={idx} className="bg-white dark:bg-card-custom border border-border-custom rounded-3xl p-6 text-left shadow-2xs hover-lift transition-all">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 w-fit mb-5">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100 mb-2">{feat.title}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{feat.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* SECCIÓN PLANES */}
      <section id="planes" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              Planes de suscripción simples
            </h2>
            <p className="text-sm sm:text-base text-zinc-550 dark:text-zinc-450 leading-relaxed">
              Elige el plan ideal según las dimensiones de tu comercio. Sin cargos ocultos, cambia de plan cuando quieras.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, idx) => {
              const waUrl = `https://wa.me/5492954624125?text=${encodeURIComponent(plan.whatsappText)}`
              
              return (
                <div 
                  key={idx} 
                  className={`bg-white dark:bg-card-custom border rounded-3xl p-8 text-left flex flex-col justify-between relative transition-all ${
                    plan.popular 
                      ? 'border-primary ring-4 ring-primary/10 shadow-xl' 
                      : 'border-border-custom shadow-xs hover:border-zinc-300 dark:hover:border-zinc-800'
                  }`}
                >
                  {plan.popular && (
                    <span className="bg-primary text-white text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full absolute -top-3.5 right-6 shadow-sm">
                      MÁS POPULAR
                    </span>
                  )}
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-black text-xl text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
                      <p className="text-xs text-zinc-450 dark:text-zinc-400 mt-2 leading-relaxed">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-zinc-900 dark:text-zinc-50">{plan.price}</span>
                      <span className="text-xs text-zinc-400 font-semibold">/mes (ARS)</span>
                    </div>

                    <div className="border-t border-border-custom pt-6">
                      <ul className="space-y-3.5">
                        {plan.features.map((feat, featIdx) => (
                          <li key={featIdx} className="flex items-start gap-2.5 text-xs text-zinc-650 dark:text-zinc-350">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border-custom/50">
                    <Button 
                      onClick={() => window.open(waUrl, '_blank')} 
                      className={`w-full font-extrabold text-xs py-3 ${
                        plan.popular
                          ? 'bg-primary hover:bg-primary-accent text-white shadow-sm'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100'
                      }`}
                    >
                      <span>Solicitar Plan por WhatsApp</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border-custom py-12 bg-zinc-50/50 dark:bg-zinc-950/45">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <Scissors className="w-4 h-4" />
            </div>
            <span className="text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              MI TURNO <span className="text-primary font-black">VIP</span>
            </span>
          </div>

          <p className="text-[11px] text-zinc-400">
            © {new Date().getFullYear()} Mi Turno VIP. Todos los derechos reservados. Santa Rosa, La Pampa.
          </p>
        </div>
      </footer>

    </div>
  )
}
