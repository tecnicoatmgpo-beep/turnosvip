'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Scissors, 
  Phone, 
  Mail, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2,
  FileText,
  Sparkles
} from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  category: string | null
}

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  specialty: string | null
  email: string
}

interface BusySlot {
  appointment_time: string
  staff_id: string
  duration_minutes: number
}

interface Tenant {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  email: string | null
}

export default function PublicBookingPage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenantSlug as string

  // State
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successAppt, setSuccessAppt] = useState<any | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [busySlots, setBusySlots] = useState<BusySlot[]>([])
  const [limitReached, setLimitReached] = useState(false)

  // Booking Flow Steps: 1 = Service, 2 = Staff, 3 = Date & Time, 4 = Client Data, 5 = Done
  const [step, setStep] = useState(1)
  
  // Selection state
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedStaff, setSelectedStaff] = useState<string>('any') // 'any' or staff ID
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('') // e.g. "10:30"
  
  // Form input state
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [notes, setNotes] = useState('')
  
  const [submitting, setSubmitting] = useState(false)

  // Fetch booking data
  useEffect(() => {
    const loadBookingData = async () => {
      setLoading(true)
      setErrorMsg('')
      try {
        const res = await fetch(`/api/public/booking-data?slug=${tenantSlug}`)
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Error al cargar datos del comercio')
        }
        setTenant(data.tenant)
        setServices(data.services)
        setStaff(data.staff)
        setBusySlots(data.busySlots)
        setLimitReached(data.limitReached)
      } catch (err: any) {
        console.error(err)
        setErrorMsg(err.message || 'Error al conectar con el servidor')
      } finally {
        setLoading(false)
      }
    }

    if (tenantSlug) {
      loadBookingData()
    }
  }, [tenantSlug])

  // Get Dates for the next 14 days starting today
  const getBookingDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 14; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      dates.push(d)
    }
    return dates
  }

  const bookingDates = getBookingDates()

  // Generate hourly time slots (e.g. 08:00 to 20:00 every 30 mins)
  const getTimeSlots = () => {
    const slots = []
    const startHour = 8
    const endHour = 20
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`)
      slots.push(`${h.toString().padStart(2, '0')}:30`)
    }
    return slots
  }

  const timeSlots = getTimeSlots()

  // Check if a time slot is busy (overlapping with existing appointments)
  const isSlotBusy = (timeStr: string) => {
    if (!selectedService) return true
    
    const [hour, minute] = timeStr.split(':').map(Number)
    const proposedTime = new Date(selectedDate)
    proposedTime.setHours(hour, minute, 0, 0)

    const selectedServiceObj = services.find(s => s.id === selectedService)
    const proposedDuration = selectedServiceObj ? selectedServiceObj.duration_minutes : 30
    const proposedEnd = new Date(proposedTime.getTime() + proposedDuration * 60 * 1000)

    // Check if the proposed time is in the past
    if (proposedTime.getTime() < new Date().getTime()) {
      return true
    }

    if (selectedStaff !== 'any') {
      // Check for specific staff member
      return busySlots.some(slot => {
        if (slot.staff_id !== selectedStaff) return false
        const slotStart = new Date(slot.appointment_time)
        const slotEnd = new Date(slotStart.getTime() + slot.duration_minutes * 60 * 1000)
        return (proposedTime < slotEnd) && (proposedEnd > slotStart)
      })
    } else {
      // Check if ALL staff members are busy at this slot
      if (staff.length === 0) return true
      return staff.every(member => {
        return busySlots.some(slot => {
          if (slot.staff_id !== member.id) return false
          const slotStart = new Date(slot.appointment_time)
          const slotEnd = new Date(slotStart.getTime() + slot.duration_minutes * 60 * 1000)
          return (proposedTime < slotEnd) && (proposedEnd > slotStart)
        })
      })
    }
  }

  // Handle step confirmations
  const handleServiceSelect = (id: string) => {
    setSelectedService(id)
    setStep(2)
  }

  const handleStaffSelect = (id: string) => {
    setSelectedStaff(id)
    setStep(3)
  }

  const handleDateTimeConfirm = () => {
    if (!selectedTimeSlot) return
    setStep(4)
  }

  // Find a free staff member for "any" option at selected time
  const findAvailableStaffId = () => {
    if (selectedStaff !== 'any') return selectedStaff

    const [hour, minute] = selectedTimeSlot.split(':').map(Number)
    const proposedTime = new Date(selectedDate)
    proposedTime.setHours(hour, minute, 0, 0)

    const selectedServiceObj = services.find(s => s.id === selectedService)
    const proposedDuration = selectedServiceObj ? selectedServiceObj.duration_minutes : 30
    const proposedEnd = new Date(proposedTime.getTime() + proposedDuration * 60 * 1000)

    // Find the first staff member who is free
    const freeStaff = staff.find(member => {
      const isBusy = busySlots.some(slot => {
        if (slot.staff_id !== member.id) return false
        const slotStart = new Date(slot.appointment_time)
        const slotEnd = new Date(slotStart.getTime() + slot.duration_minutes * 60 * 1000)
        return (proposedTime < slotEnd) && (proposedEnd > slotStart)
      })
      return !isBusy
    })

    return freeStaff ? freeStaff.id : staff[0]?.id
  }

  // Submit booking request
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant || !selectedService || !selectedTimeSlot) return
    
    setSubmitting(true)
    setErrorMsg('')

    const [hour, minute] = selectedTimeSlot.split(':').map(Number)
    const appointmentTime = new Date(selectedDate)
    appointmentTime.setHours(hour, minute, 0, 0)

    const assignedStaffId = findAvailableStaffId()

    try {
      const res = await fetch('/api/public/create-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail || null,
          service_id: selectedService,
          staff_id: assignedStaffId,
          appointment_time: appointmentTime.toISOString(),
          notes: notes || null
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Fallo al procesar la reserva del turno')
      }

      setSuccessAppt(data.appointment)
      setStep(5)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Ocurrió un error inesperado al reservar')
    } finally {
      setSubmitting(false)
    }
  }

  // Selected details helpers
  const selectedServiceDetails = services.find(s => s.id === selectedService)
  const selectedStaffDetails = staff.find(s => s.id === selectedStaff)

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-zinc-405 dark:text-zinc-550 mt-4 font-semibold">Cargando catálogo de reservas...</p>
      </div>
    )
  }

  // Error Screen
  if (errorMsg && step === 1 && !tenant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-full">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">Error al Cargar Comercio</h2>
        <p className="text-xs text-zinc-650 dark:text-zinc-400">
          {errorMsg}. Por favor verifica el link o intenta nuevamente.
        </p>
        <Button onClick={() => router.push('/')} className="bg-primary hover:bg-primary-hover text-white text-xs py-2 px-5 rounded-lg">
          Volver a Inicio
        </Button>
      </div>
    )
  }

  // Limit reached or suspended screen
  if (limitReached && step !== 5) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900 text-amber-600 dark:text-amber-400 rounded-full">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">Reservas Temporales Deshabilitadas</h2>
        <p className="text-xs text-zinc-650 dark:text-zinc-400">
          Lo sentimos, el comercio **{tenant?.name}** no puede recibir más reservas online en este momento debido a límites en su plan mensual de suscripción.
        </p>
        <Button onClick={() => router.push('/')} className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs py-2 px-5 rounded-lg">
          Volver a Inicio
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* SHOP INFO / HEADER */}
        {tenant && step !== 5 && (
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{tenant.name}</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">Portal de Reservas Online</p>
            {tenant.address && (
              <p className="text-zinc-400 dark:text-zinc-500 text-xs">{tenant.address}</p>
            )}
          </div>
        )}

        {/* STEP PROGRESS INDICATOR */}
        {step < 5 && (
          <div className="bg-white dark:bg-card-custom border border-border-custom p-4 rounded-2xl shadow-xs">
            <div className="flex justify-between items-center text-xs text-zinc-405 font-bold mb-2">
              <span>Paso {step} de 4</span>
              <span>
                {step === 1 && 'Selección de Servicio'}
                {step === 2 && 'Selección de Profesional'}
                {step === 3 && 'Fecha y Hora'}
                {step === 4 && 'Tus Datos de Contacto'}
              </span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* ALERTS */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-250 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: SELECT SERVICE */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">1. Selecciona un Servicio</h3>
            {services.length === 0 ? (
              <p className="text-xs text-zinc-400 italic text-center py-6">No hay servicios disponibles.</p>
            ) : (
              <div className="space-y-3">
                {services.map((svc) => (
                  <div 
                    key={svc.id}
                    onClick={() => handleServiceSelect(svc.id)}
                    className="p-5 bg-white dark:bg-card-custom border border-border-custom rounded-2xl shadow-2xs hover:border-primary/50 cursor-pointer flex justify-between items-center group transition-all"
                  >
                    <div className="space-y-1 text-left">
                      <h4 className="font-extrabold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors text-sm">{svc.name}</h4>
                      {svc.description && (
                        <p className="text-xs text-zinc-450 dark:text-zinc-400 line-clamp-2">{svc.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] bg-primary-light text-primary dark:bg-primary-light/10 dark:text-primary-hover px-2 py-0.5 rounded-full font-bold">
                          {svc.duration_minutes} min
                        </span>
                        {svc.category && (
                          <span className="text-[10px] bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                            {svc.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-base font-black text-primary dark:text-primary-hover shrink-0 ml-4">
                      {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(svc.price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SELECT STAFF */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">2. Selecciona un Profesional</h3>
              <button 
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Option: Anyone */}
              <div 
                onClick={() => handleStaffSelect('any')}
                className={`p-5 bg-white dark:bg-card-custom border rounded-2xl shadow-2xs cursor-pointer flex items-center gap-4 transition-all hover:border-primary/50 ${
                  selectedStaff === 'any' ? 'border-primary ring-2 ring-primary/10' : 'border-border-custom'
                }`}
              >
                <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm">Cualquier Profesional disponible</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Asignación automática rápida al momento de tu reserva.</p>
                </div>
              </div>

              {/* Specific staff list */}
              {staff.map((member) => (
                <div 
                  key={member.id}
                  onClick={() => handleStaffSelect(member.id)}
                  className={`p-5 bg-white dark:bg-card-custom border rounded-2xl shadow-2xs cursor-pointer flex items-center gap-4 transition-all hover:border-primary/50 ${
                    selectedStaff === member.id ? 'border-primary ring-2 ring-primary/10' : 'border-border-custom'
                  }`}
                >
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-300 rounded-xl border border-border-custom shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm">
                      {member.first_name} {member.last_name}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {member.specialty || 'Profesional'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: DATE & TIME */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">3. Elige Fecha y Hora</h3>
              <button 
                onClick={() => setStep(2)}
                className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            {/* Selected summary */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-border-custom rounded-2xl text-xs space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-zinc-400">Servicio:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedServiceDetails?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Duración:</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedServiceDetails?.duration_minutes} minutos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Precio:</span>
                <span className="font-bold text-primary dark:text-primary-hover">${Number(selectedServiceDetails?.price).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between border-t border-border-custom pt-1.5 mt-1.5">
                <span className="text-zinc-400">Profesional:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {selectedStaff === 'any' ? 'Cualquier profesional' : `${selectedStaffDetails?.first_name} ${selectedStaffDetails?.last_name}`}
                </span>
              </div>
            </div>

            {/* Date horizontal scroller */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-405 dark:text-zinc-500">Seleccionar Día</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {bookingDates.map((date) => {
                  const isSelected = selectedDate.toDateString() === date.toDateString()
                  const isToday = new Date().toDateString() === date.toDateString()
                  const dayName = date.toLocaleDateString('es-AR', { weekday: 'short' })
                  const dayNum = date.getDate()
                  const monthName = date.toLocaleDateString('es-AR', { month: 'short' })

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date)
                        setSelectedTimeSlot('')
                      }}
                      className={`flex flex-col items-center justify-center p-3.5 rounded-xl border min-w-[70px] shrink-0 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-primary text-white border-primary shadow-sm font-bold scale-102' 
                          : 'bg-white dark:bg-card-custom border-border-custom text-zinc-650 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider">{dayName}</span>
                      <span className="text-lg font-black my-0.5">{dayNum}</span>
                      <span className="text-[9px] uppercase">{monthName}</span>
                      {isToday && <span className="text-[8px] font-bold bg-white/20 px-1 py-0.5 rounded mt-1">HOY</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Hour grid selector */}
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-405 dark:text-zinc-500">Seleccionar Horario Disponible</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {timeSlots.map((time) => {
                  const isBusy = isSlotBusy(time)
                  const isSelected = selectedTimeSlot === time

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isBusy}
                      onClick={() => setSelectedTimeSlot(time)}
                      className={`py-3.5 rounded-xl border text-center transition-all text-xs font-bold cursor-pointer ${
                        isBusy 
                          ? 'bg-zinc-50 text-zinc-300 border-zinc-200 dark:bg-zinc-900/10 dark:text-zinc-800 dark:border-zinc-900 cursor-not-allowed opacity-40 line-through' 
                          : isSelected 
                            ? 'bg-primary text-white border-primary font-black shadow-sm' 
                            : 'bg-white dark:bg-card-custom border-border-custom text-zinc-850 hover:border-primary/45 dark:text-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      {time}
                    </button>
                  )
                })}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleDateTimeConfirm}
              disabled={!selectedTimeSlot}
              className="w-full bg-primary hover:bg-primary-accent text-white font-bold py-3 mt-4"
            >
              <span>Confirmar Fecha y Hora</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* STEP 4: CLIENT DATA & FINAL SUBMIT */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">4. Ingresa tus datos</h3>
              <button 
                onClick={() => setStep(3)}
                className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            {/* Selected Booking Summary */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-border-custom rounded-2xl text-xs space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-zinc-400">Servicio:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedServiceDetails?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Precio:</span>
                <span className="font-bold text-primary dark:text-primary-hover">${Number(selectedServiceDetails?.price).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Profesional:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {selectedStaff === 'any' ? 'Cualquier profesional' : `${selectedStaffDetails?.first_name} ${selectedStaffDetails?.last_name}`}
                </span>
              </div>
              <div className="flex justify-between border-t border-border-custom pt-1.5 mt-1.5">
                <span className="text-zinc-400">Fecha:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Hora:</span>
                <span className="font-black text-primary">{selectedTimeSlot} h</span>
              </div>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-650 dark:text-zinc-350">Tu Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-border-custom rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-card-custom dark:border-border-custom dark:text-zinc-100 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-650 dark:text-zinc-350">Tu Número de Teléfono/WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej. 2954123456"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-border-custom rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-card-custom dark:border-border-custom dark:text-zinc-100 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-650 dark:text-zinc-350">Email (Opcional)</label>
                <input
                  type="email"
                  placeholder="Ej. juan@correo.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-border-custom rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-card-custom dark:border-border-custom dark:text-zinc-100 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-650 dark:text-zinc-350">Notas o comentarios para el profesional</label>
                <textarea
                  placeholder="Ej. Prefiero lavado corto. Tengo el pelo con tintura previa."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-card-custom border border-border-custom rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px] max-h-[100px]"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !clientName || !clientPhone}
                className="w-full bg-primary hover:bg-primary-accent text-white font-extrabold py-3 shadow-md mt-6 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar y Reservar Turno</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* STEP 5: BOOKING SUCCESS */}
        {step === 5 && successAppt && tenant && (
          <div className="p-8 bg-white dark:bg-card-custom border border-border-custom rounded-3xl shadow-xl text-center space-y-6 max-w-md mx-auto">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-full w-fit mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50">¡Reserva Completada!</h2>
              <p className="text-xs text-zinc-650 dark:text-zinc-400">
                Tu turno para **{tenant.name}** ha sido reservado con éxito.
              </p>
            </div>

            {/* Thermal ticket style recap card */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-border-custom rounded-2xl p-5 text-xs space-y-3 font-mono text-left max-w-xs mx-auto">
              <div className="text-center font-bold text-[11px] border-b border-dashed border-border-custom pb-2 uppercase tracking-wide">
                Resumen de Turno
              </div>
              <div className="space-y-1">
                <p><strong>Comercio:</strong> {tenant.name}</p>
                <p><strong>Servicio:</strong> {selectedServiceDetails?.name}</p>
                <p><strong>Precio:</strong> ${Number(selectedServiceDetails?.price).toLocaleString('es-AR')}</p>
                <p><strong>Fecha:</strong> {selectedDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p><strong>Horario:</strong> {selectedTimeSlot} h</p>
                {notes && <p><strong>Nota:</strong> "{notes}"</p>}
              </div>
              <div className="border-t border-dashed border-border-custom pt-2 mt-2 text-center text-[10px] text-zinc-400 font-sans">
                Por favor, asiste 5 minutos antes.
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <Button 
                onClick={() => router.push('/')} 
                className="bg-primary hover:bg-primary-accent text-white font-extrabold text-xs py-3 w-full"
              >
                Volver al Inicio
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
