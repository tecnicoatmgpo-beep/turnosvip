'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { 
  Wallet, ArrowUpRight, ArrowDownRight, AlertCircle, 
  HelpCircle, Calendar, PlusCircle, CheckCircle2, XCircle, 
  DollarSign, Receipt, TrendingUp, BarChart2, ShieldAlert,
  User, ClipboardList, Info, Loader2, ArrowRight, ShieldCheck, History, Clock, Lock, Unlock, ArrowDown, ArrowUp
} from 'lucide-react'

interface CashRegister {
  id: string
  opened_at: string
  opened_by: string
  opening_balance: number
  expected_closing_balance: number | null
  actual_closing_balance: number | null
  status: 'open' | 'closed'
  notes: string | null
  closed_at: string | null
  closed_by: string | null
  opened_by_user?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  }
  closed_by_user?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  }
}

interface CashTransaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  payment_method: 'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'mercadopago'
  category: 'servicio' | 'producto' | 'gasto_insumos' | 'gasto_limpieza' | 'sueldo_adelanto' | 'retiro_caja' | 'otro'
  notes: string | null
  created_at: string
  reference_id: string | null
  user_id: string
  user?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  }
}

interface RegisterSummary {
  totalIncomes: number
  totalExpenses: number
  expectedClosingBalance: number
  expectedCashInDrawer: number
  byMethod: {
    incomes: Record<string, number>
    expenses: Record<string, number>
  }
}

const methodLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta_debito: 'Tarjeta de Débito',
  tarjeta_credito: 'Tarjeta de Crédito',
  mercadopago: 'Mercado Pago'
}

const categoryLabels: Record<string, string> = {
  servicio: 'Cobro de Cita (Servicio)',
  producto: 'Venta de Producto',
  gasto_insumos: 'Gasto Insumos',
  gasto_limpieza: 'Gasto Limpieza',
  sueldo_adelanto: 'Adelanto de Sueldo',
  retiro_caja: 'Retiro de Caja',
  otro: 'Otro'
}

const categoryColors: Record<string, string> = {
  servicio: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  producto: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  gasto_insumos: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  gasto_limpieza: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  sueldo_adelanto: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  retiro_caja: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  otro: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
}

export default function CashRegisterPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  // Session & User Info
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('staff')
  const [currentUserName, setCurrentUserName] = useState<string>('')

  // Loading States
  const [loadingActive, setLoadingActive] = useState(true)
  const [loadingPast, setLoadingPast] = useState(true)
  const [openingCaja, setOpeningCaja] = useState(false)
  const [closingCaja, setClosingCaja] = useState(false)
  const [submittingTx, setSubmittingTx] = useState(false)
  const [loadingAudit, setLoadingAudit] = useState(false)

  // Caja State
  const [activeSession, setActiveSession] = useState<{
    isOpen: boolean
    register: CashRegister | null
    summary: RegisterSummary | null
  }>({
    isOpen: false,
    register: null,
    summary: null
  })
  const [activeTransactions, setActiveTransactions] = useState<CashTransaction[]>([])
  const [pastSessions, setPastSessions] = useState<CashRegister[]>([])

  // UI Tabs State
  const [activeTab, setActiveTab] = useState<'caja_actual' | 'historial'>('caja_actual')

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [selectedAuditRegister, setSelectedAuditRegister] = useState<CashRegister | null>(null)
  const [auditTransactions, setAuditTransactions] = useState<CashTransaction[]>([])

  // Input states
  const [openingBalance, setOpeningBalance] = useState('0')
  const [openingNotes, setOpeningNotes] = useState('')
  const [actualClosingBalance, setActualClosingBalance] = useState('0')
  const [closingNotes, setClosingNotes] = useState('')

  // Manual Transaction input states
  const [txType, setTxType] = useState<'income' | 'expense'>('income')
  const [txAmount, setTxAmount] = useState('')
  const [txPaymentMethod, setTxPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'mercadopago'>('efectivo')
  const [txCategory, setTxCategory] = useState<string>('servicio')
  const [txNotes, setTxNotes] = useState('')

  // Notifications
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const showNotification = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(msg)
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(''), 4000)
    }
  }

  // Load tenant id and user profile
  useEffect(() => {
    const initPage = async () => {
      const supabase = createClient()
      
      // 1. Fetch Tenant ID by Slug
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single()
      
      if (tenant) {
        setTenantId(tenant.id)
        
        // 2. Fetch User Profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('role, first_name, last_name')
            .eq('id', user.id)
            .single()
          
          if (profile) {
            setUserRole(profile.role || 'staff')
            setCurrentUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email?.split('@')[0] || '')
          }
        }

        // 3. Load active register status and historical records
        await loadCajaData(tenant.id)
        await fetchPastSessions(tenant.id)
      }
    }

    if (tenantSlug) {
      initPage()
    }
  }, [tenantSlug])

  // Fetch active transactions for current session
  const fetchActiveTransactions = async (registerId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('*, user:users(first_name, last_name, email)')
      .eq('register_id', registerId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.warn('Error fetching active transactions with relation, running fallback:', error)
      const rawRes = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('register_id', registerId)
        .order('created_at', { ascending: false })
      
      if (!rawRes.error) {
        const { data: usersData } = await supabase.from('users').select('id, first_name, last_name, email')
        const userMap = new Map(usersData?.map(u => [u.id, u]) || [])
        const mapped = (rawRes.data || []).map(tx => ({
          ...tx,
          user: userMap.get(tx.user_id) || null
        }))
        setActiveTransactions(mapped as any[])
      }
    } else {
      setActiveTransactions(data || [])
    }
  }

  // Fetch all past closed registers
  const fetchPastSessions = async (tId: string) => {
    setLoadingPast(true)
    const supabase = createClient()
    
    // Try querying with foreign key aliases
    let { data, error } = await supabase
      .from('cash_registers')
      .select(`
        *,
        opened_by_user:users!cash_registers_opened_by_fkey(first_name, last_name, email),
        closed_by_user:users!cash_registers_closed_by_fkey(first_name, last_name, email)
      `)
      .eq('tenant_id', tId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
    
    if (error) {
      console.warn('Error fetching past registers with aliases, trying fallback:', error)
      const fallbackRes = await supabase
        .from('cash_registers')
        .select('*')
        .eq('tenant_id', tId)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
      
      if (fallbackRes.error) {
        console.error('Error in fallback query:', fallbackRes.error)
      } else {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
        
        const userMap = new Map(usersData?.map(u => [u.id, u]) || [])
        const mapped = (fallbackRes.data || []).map(reg => ({
          ...reg,
          opened_by_user: userMap.get(reg.opened_by) || null,
          closed_by_user: reg.closed_by ? userMap.get(reg.closed_by) || null : null
        }))
        setPastSessions(mapped as any[])
      }
    } else {
      setPastSessions(data || [])
    }
    setLoadingPast(false)
  }

  // Load status of caja
  const loadCajaData = async (tId: string) => {
    setLoadingActive(true)
    try {
      const res = await fetch(`/api/tenant/caja/status?tenant_id=${tId}`)
      const data = await res.json()
      if (res.ok && data.isOpen) {
        setActiveSession({
          isOpen: true,
          register: data.register,
          summary: data.summary
        })
        if (data.register?.id) {
          await fetchActiveTransactions(data.register.id)
        }
      } else {
        setActiveSession({
          isOpen: false,
          register: null,
          summary: null
        })
        setActiveTransactions([])
      }
    } catch (e) {
      console.error('Error fetching active register status:', e)
    } finally {
      setLoadingActive(false)
    }
  }

  // Form submits
  const handleOpenCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    setOpeningCaja(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/tenant/caja/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opening_balance: Number(openingBalance),
          notes: openingNotes || null,
          tenant_id: tenantId
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al abrir la caja.')
      }
      showNotification('Caja diaria abierta con éxito.', 'success')
      setOpeningBalance('0')
      setOpeningNotes('')
      if (tenantId) {
        await loadCajaData(tenantId)
        await fetchPastSessions(tenantId)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al abrir la caja.')
    } finally {
      setOpeningCaja(false)
    }
  }

  const handleCloseCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    setClosingCaja(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/tenant/caja/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_closing_balance: Number(actualClosingBalance),
          notes: closingNotes || null,
          tenant_id: tenantId
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al cerrar la caja.')
      }
      
      const discrepancy = data.discrepancy
      if (discrepancy === 0) {
        showNotification('Caja cerrada con éxito. Caja cuadrada perfectamente.', 'success')
      } else if (discrepancy < 0) {
        showNotification(`Caja cerrada. Arqueo con FALTANTE de $${Math.abs(discrepancy).toLocaleString()}`, 'error')
      } else {
        showNotification(`Caja cerrada. Arqueo con SOBRANTE de $${discrepancy.toLocaleString()}`, 'success')
      }

      setActualClosingBalance('0')
      setClosingNotes('')
      setIsCloseModalOpen(false)
      if (tenantId) {
        await loadCajaData(tenantId)
        await fetchPastSessions(tenantId)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cerrar la caja.')
    } finally {
      setClosingCaja(false)
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingTx(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/tenant/caja/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txType,
          amount: Number(txAmount),
          payment_method: txPaymentMethod,
          category: txCategory,
          notes: txNotes || null,
          tenant_id: tenantId
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar transacción')
      }
      showNotification('Transacción manual registrada con éxito.', 'success')
      setTxAmount('')
      setTxNotes('')
      setTxType('income')
      setTxCategory('servicio')
      setTxPaymentMethod('efectivo')
      setIsTxModalOpen(false)
      if (tenantId) {
        await loadCajaData(tenantId)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar transacción.')
    } finally {
      setSubmittingTx(false)
    }
  }

  // Load audit timeline for past session
  const handleOpenAuditModal = async (register: CashRegister) => {
    setSelectedAuditRegister(register)
    setIsAuditModalOpen(true)
    setLoadingAudit(true)
    try {
      const supabase = createClient()
      
      let { data, error } = await supabase
        .from('cash_transactions')
        .select('*, user:users(first_name, last_name, email)')
        .eq('register_id', register.id)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.warn('Error fetching audit transactions with user relation, trying fallback:', error)
        const rawRes = await supabase
          .from('cash_transactions')
          .select('*')
          .eq('register_id', register.id)
          .order('created_at', { ascending: true })
        
        if (rawRes.error) throw rawRes.error
        
        const { data: usersData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
        
        const userMap = new Map(usersData?.map(u => [u.id, u]) || [])
        const mapped = (rawRes.data || []).map(tx => ({
          ...tx,
          user: userMap.get(tx.user_id) || null
        }))
        setAuditTransactions(mapped as any[])
      } else {
        setAuditTransactions(data || [])
      }
    } catch (e) {
      console.error('Error fetching audit transactions:', e)
    } finally {
      setLoadingAudit(false)
    }
  }

  // Adjust default category depending on txType
  useEffect(() => {
    if (txType === 'income') {
      setTxCategory('servicio')
    } else {
      setTxCategory('gasto_insumos')
    }
  }, [txType])

  // Custom Double SVG Bar Chart Calculations
  const renderSVGChart = () => {
    if (!activeSession.summary) return null
    const methods = ['efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'mercadopago']
    const incomes = activeSession.summary.byMethod.incomes
    const expenses = activeSession.summary.byMethod.expenses

    const values = [
      ...methods.map(m => incomes[m] || 0),
      ...methods.map(m => expenses[m] || 0)
    ]
    const maxVal = Math.max(...values, 1000) // minimum scale of 1000 to look nice

    return (
      <div className="w-full bg-white dark:bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-primary" />
          Ingresos vs Egresos por Medio de Pago (Esta Sesión)
        </h4>
        <div className="relative w-full h-[180px]">
          <svg className="w-full h-full" viewBox="0 0 500 180" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="40" y1="20" x2="480" y2="20" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeDasharray="3,3" />
            <line x1="40" y1="75" x2="480" y2="75" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeDasharray="3,3" />
            <line x1="40" y1="130" x2="480" y2="130" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeDasharray="3,3" />
            <line x1="40" y1="130" x2="480" y2="130" stroke="currentColor" className="text-zinc-300 dark:text-zinc-700" />

            {/* Render Bars */}
            {methods.map((method, idx) => {
              const incVal = incomes[method] || 0
              const expVal = expenses[method] || 0
              
              // Map height to SVG coordinates (max height = 110px, starting from bottom y = 130)
              const incHeight = (incVal / maxVal) * 110
              const expHeight = (expVal / maxVal) * 110
              
              const xBase = 60 + idx * 85
              
              return (
                <g key={method} className="group">
                  {/* Income bar (green) */}
                  <rect 
                    x={xBase} 
                    y={130 - incHeight} 
                    width="18" 
                    height={incHeight} 
                    rx="3"
                    className="fill-emerald-500 hover:fill-emerald-600 transition-colors"
                  />
                  {/* Expense bar (red) */}
                  <rect 
                    x={xBase + 22} 
                    y={130 - expHeight} 
                    width="18" 
                    height={expHeight} 
                    rx="3"
                    className="fill-rose-500 hover:fill-rose-600 transition-colors"
                  />
                  {/* Labels */}
                  <text 
                    x={xBase + 20} 
                    y="150" 
                    textAnchor="middle" 
                    className="text-[9px] fill-zinc-550 dark:fill-zinc-400 font-medium"
                  >
                    {methodLabels[method].split(' ')[0]}
                  </text>
                  <text 
                    x={xBase + 20} 
                    y="162" 
                    textAnchor="middle" 
                    className="text-[9px] fill-zinc-400 dark:fill-zinc-500"
                  >
                    {methodLabels[method].split(' ')[1] || ''}
                  </text>

                  {/* Tooltips visible on SVG elements (optional title tag) */}
                  <title>{`${methodLabels[method]}: Ingresos $${incVal.toLocaleString()} | Egresos $${expVal.toLocaleString()}`}</title>
                </g>
              )
            })}
          </svg>
        </div>
        
        {/* Chart Legend */}
        <div className="flex justify-center items-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-zinc-650 dark:text-zinc-350">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
            <span>Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-zinc-650 dark:text-zinc-350">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
            <span>Egresos</span>
          </div>
        </div>
      </div>
    )
  }

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return '-'
    const d = new Date(isoString)
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTimeOnly = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Pre-calculations for current status
  const operatorName = activeSession.register?.opened_by_user 
    ? `${activeSession.register.opened_by_user.first_name || ''} ${activeSession.register.opened_by_user.last_name || ''}`.trim() || activeSession.register.opened_by_user.email
    : 'Operador'

  const userRoleIsStaff = userRole === 'staff'

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            Caja Diaria y POS Financiero
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Administra aperturas, cierres de arqueo, transacciones y control de ingresos de citas y ventas de productos.
          </p>
        </div>
        
        {/* Toggle View Tabs */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-border-custom self-end md:self-auto">
          <button
            onClick={() => setActiveTab('caja_actual')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'caja_actual'
                ? 'bg-white dark:bg-card-custom text-zinc-950 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Caja Actual
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'historial'
                ? 'bg-white dark:bg-card-custom text-zinc-950 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial de Arqueos
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-lg flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-500/30 text-rose-800 dark:text-rose-300 p-4 rounded-lg flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {loadingActive ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Consultando estado de caja diaria...</span>
        </div>
      ) : (
        <>
          {activeTab === 'caja_actual' && (
            <>
              {/* CLOSED STATE VIEW */}
              {!activeSession.isOpen ? (
                <div className="max-w-xl mx-auto mt-6 bg-white dark:bg-card-custom border border-border-custom rounded-2xl p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-150 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-rose-500" />
                  
                  <div className="inline-flex p-4 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                    <Lock className="w-10 h-10" />
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">La Caja Diaria está Cerrada</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm mx-auto">
                      Para poder cobrar citas (agenda) o registrar ventas de productos (POS de clientes), debes abrir una nueva sesión diaria con el saldo de apertura inicial.
                    </p>
                  </div>

                  <form onSubmit={handleOpenCaja} className="space-y-4 max-w-md mx-auto text-left border-t border-border-custom pt-6">
                    <Input
                      label="Saldo Inicial en Efectivo"
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="Ej: 5000"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                    />
                    
                    <Input
                      label="Notas de Apertura (Opcional)"
                      type="text"
                      placeholder="Ej: Cambio inicial recibido en caja chica"
                      value={openingNotes}
                      onChange={(e) => setOpeningNotes(e.target.value)}
                    />

                    <Button 
                      type="submit" 
                      className="w-full mt-4 flex items-center justify-center gap-2 cursor-pointer"
                      disabled={openingCaja}
                    >
                      {openingCaja ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Abriendo Caja...</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4" />
                          <span>Abrir Caja Diaria</span>
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              ) : (
                /* OPENED STATE VIEW */
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Status Banner */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500 text-white rounded-lg animate-pulse">
                        <Unlock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Sesión de Caja Abierta</div>
                        <div className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5">
                          Iniciada el {formatDateTime(activeSession.register?.opened_at ?? '')} por <span className="font-semibold">{operatorName}</span>.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTxModalOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-emerald-500/30 text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Transacción Manual
                      </Button>
                      
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setActualClosingBalance('')
                          setClosingNotes('')
                          setIsCloseModalOpen(true)}
                        }
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-4 h-4" />
                        Cerrar Caja (Arqueo)
                      </Button>
                    </div>
                  </div>

                  {/* Financial KPIs Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Saldo Inicial */}
                    <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-4 shadow-2xs">
                      <div className="text-xs text-zinc-450 dark:text-zinc-400 font-semibold uppercase tracking-wide">Saldo Inicial</div>
                      <div className="text-lg md:text-xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">
                        ${Number(activeSession.register?.opening_balance).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Ingresos Totales */}
                    <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-4 shadow-2xs">
                      <div className="text-xs text-zinc-450 dark:text-zinc-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                        Ingresos (POS)
                      </div>
                      <div className="text-lg md:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                        +${Number(activeSession.summary?.totalIncomes).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Egresos Totales */}
                    <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-4 shadow-2xs">
                      <div className="text-xs text-zinc-450 dark:text-zinc-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                        Egresos / Gastos
                      </div>
                      <div className="text-lg md:text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                        -${Number(activeSession.summary?.totalExpenses).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Saldo Esperado Caja Físico (Efectivo) */}
                    <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-4 shadow-2xs col-span-2 md:col-span-1">
                      <div className="text-xs text-zinc-450 dark:text-zinc-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        Efectivo en Caja
                      </div>
                      <div className="text-lg md:text-xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">
                        ${Number(activeSession.summary?.expectedCashInDrawer).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-zinc-405 dark:text-zinc-500 mt-0.5">Saldo inicial + efectivo neto</div>
                    </div>

                    {/* Saldo Total Esperado (Efectivo + Electrónico) */}
                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 shadow-2xs col-span-2 md:col-span-1">
                      <div className="text-xs text-primary dark:text-primary-hover font-semibold uppercase tracking-wide flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Total Esperado
                      </div>
                      <div className="text-lg md:text-xl font-extrabold text-primary dark:text-white mt-1">
                        ${Number(activeSession.summary?.expectedClosingBalance).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-primary/70 dark:text-zinc-450 mt-0.5">Todos los medios de pago</div>
                    </div>
                  </div>

                  {/* Visual Analytics & Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* SVG Chart Panel */}
                    <div className="lg:col-span-2">
                      {renderSVGChart()}
                    </div>

                    {/* Table-list Breakdown of payment methods */}
                    <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
                          <Receipt className="w-4 h-4 text-primary" />
                          Desglose por Medios de Pago
                        </h4>
                        
                        <div className="space-y-3.5">
                          {Object.keys(methodLabels).map(method => {
                            const inc = activeSession.summary?.byMethod.incomes[method] || 0
                            const exp = activeSession.summary?.byMethod.expenses[method] || 0
                            const net = inc - exp

                            return (
                              <div key={method} className="flex justify-between items-center text-xs border-b border-border-custom/50 pb-2">
                                <div>
                                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">{methodLabels[method]}</div>
                                  <div className="flex gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                    <span>Ing: +${inc.toLocaleString()}</span>
                                    <span>Egr: -${exp.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className={`font-bold ${
                                  net > 0 
                                    ? 'text-emerald-600 dark:text-emerald-400' 
                                    : net < 0 
                                    ? 'text-rose-600 dark:text-rose-400' 
                                    : 'text-zinc-400 dark:text-zinc-650'
                                }`}>
                                  ${net.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border-custom bg-zinc-50 dark:bg-zinc-800/30 p-2.5 rounded-lg text-center">
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>Usa las transacciones manuales para registrar retiros de caja o gastos varios.</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active transactions table */}
                  <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Transacciones de la Sesión</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Historial cronológico de cobros y egresos registrados desde la apertura de caja.</p>
                      </div>
                      
                      <div className="text-xs font-semibold text-zinc-450 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-border-custom">
                        Total transacciones: {activeTransactions.length}
                      </div>
                    </div>

                    {activeTransactions.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-border-custom rounded-xl">
                        <ClipboardList className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Aún no hay transacciones en esta sesión diaria.</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-border-custom text-zinc-450 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-semibold">
                              <th className="pb-3 font-semibold">Hora</th>
                              <th className="pb-3 font-semibold">Operador</th>
                              <th className="pb-3 font-semibold">Tipo</th>
                              <th className="pb-3 font-semibold">Concepto / Categoría</th>
                              <th className="pb-3 font-semibold">Medio de Pago</th>
                              <th className="pb-3 font-semibold">Notas / Detalles</th>
                              <th className="pb-3 font-semibold text-right">Monto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-custom">
                            {activeTransactions.map((tx) => {
                              const operatorName = tx.user 
                                ? `${tx.user.first_name || ''} ${tx.user.last_name || ''}`.trim() || tx.user.email?.split('@')[0]
                                : 'Sistema'
                              
                              return (
                                <tr key={tx.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                  <td className="py-3.5 font-medium text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{formatTimeOnly(tx.created_at)}</td>
                                  <td className="py-3.5 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{operatorName}</td>
                                  <td className="py-3.5 whitespace-nowrap">
                                    {tx.type === 'income' ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
                                        <ArrowUp className="w-3 h-3" />
                                        Ingreso
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
                                        <ArrowDown className="w-3 h-3" />
                                        Egreso
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColors[tx.category] || 'bg-zinc-100 text-zinc-800'}`}>
                                      {categoryLabels[tx.category] || tx.category}
                                    </span>
                                  </td>
                                  <td className="py-3.5 font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{methodLabels[tx.payment_method]}</td>
                                  <td className="py-3.5 text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate" title={tx.notes || ''}>{tx.notes || '-'}</td>
                                  <td className={`py-3.5 text-right font-extrabold text-sm whitespace-nowrap ${
                                    tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                  }`}>
                                    {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'historial' && (
            <div className="bg-white dark:bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm animate-in fade-in duration-150">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Historial de Arqueos y Cierres</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Auditoría completa de todas las sesiones de caja diaria finalizadas y archivadas.</p>
              </div>

              {loadingPast ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-xs text-zinc-550 dark:text-zinc-400">Cargando historial de arqueos...</span>
                </div>
              ) : pastSessions.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border-custom rounded-xl mt-6">
                  <History className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Aún no se registran arqueos o cierres de caja pasados.</span>
                </div>
              ) : (
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border-custom text-zinc-450 dark:text-zinc-400 uppercase tracking-wider text-[10px] font-semibold">
                        <th className="pb-3 font-semibold">Apertura</th>
                        <th className="pb-3 font-semibold">Cierre</th>
                        <th className="pb-3 font-semibold">Cajero (Abre/Cierra)</th>
                        <th className="pb-3 font-semibold text-right">Inicial</th>
                        <th className="pb-3 font-semibold text-right">Esperado</th>
                        <th className="pb-3 font-semibold text-right">Declarado</th>
                        <th className="pb-3 font-semibold text-right">Diferencia</th>
                        <th className="pb-3 font-semibold text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {pastSessions.map((session) => {
                        const openedBy = session.opened_by_user
                          ? `${session.opened_by_user.first_name || ''} ${session.opened_by_user.last_name || ''}`.trim() || session.opened_by_user.email?.split('@')[0]
                          : 'Cajero'
                        
                        const closedBy = session.closed_by_user
                          ? `${session.closed_by_user.first_name || ''} ${session.closed_by_user.last_name || ''}`.trim() || session.closed_by_user.email?.split('@')[0]
                          : 'Cajero'
                        
                        const expected = Number(session.expected_closing_balance || 0)
                        const actual = Number(session.actual_closing_balance || 0)
                        const discrepancy = actual - expected

                        return (
                          <tr key={session.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                            <td className="py-3.5 font-medium text-zinc-500 whitespace-nowrap">{formatDateTime(session.opened_at)}</td>
                            <td className="py-3.5 font-medium text-zinc-500 whitespace-nowrap">{formatDateTime(session.closed_at)}</td>
                            <td className="py-3.5 whitespace-nowrap">
                              <div className="font-semibold text-zinc-700 dark:text-zinc-300">{openedBy}</div>
                              {openedBy !== closedBy && (
                                <div className="text-[9px] text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5 mt-0.5">
                                  <span>Cerró:</span>
                                  <span className="font-semibold">{closedBy}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 text-right font-medium text-zinc-650 dark:text-zinc-350 whitespace-nowrap">${Number(session.opening_balance).toLocaleString()}</td>
                            <td className="py-3.5 text-right font-semibold text-zinc-700 dark:text-zinc-200 whitespace-nowrap">${expected.toLocaleString()}</td>
                            <td className="py-3.5 text-right font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">${actual.toLocaleString()}</td>
                            <td className="py-3.5 text-right whitespace-nowrap">
                              {discrepancy === 0 ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Cuadrada
                                </span>
                              ) : discrepancy < 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  Faltante: -${Math.abs(discrepancy).toLocaleString()}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 px-2 py-0.5 rounded-full font-bold text-[10px]">
                                  Sobrante: +${discrepancy.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 text-center whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAuditModal(session)}
                                className="flex items-center justify-center gap-1.5 mx-auto border-primary/20 text-primary hover:bg-primary-light"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Auditar
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL: MANUAL TRANSACTION ENTRY */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title="Registrar Transacción Manual de Caja"
        size="md"
      >
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-900/40 p-1 rounded-lg border border-border-custom">
            <button
              type="button"
              onClick={() => setTxType('income')}
              className={`py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                txType === 'income'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Ingreso (+)
            </button>
            <button
              type="button"
              onClick={() => setTxType('expense')}
              className={`py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                txType === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Egreso (-)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Monto de la Transacción"
              type="number"
              min="0.01"
              step="any"
              required
              placeholder="Ej: 1500"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
            />

            <Select
              label="Medio de Pago"
              options={Object.entries(methodLabels).map(([val, lbl]) => ({ label: lbl, value: val }))}
              value={txPaymentMethod}
              onChange={(e: any) => setTxPaymentMethod(e.target.value)}
            />
          </div>

          <Select
            label="Categoría / Concepto"
            options={
              txType === 'income'
                ? [
                    { label: 'Servicio (Cita)', value: 'servicio' },
                    { label: 'Producto (Venta)', value: 'producto' },
                    { label: 'Otro', value: 'otro' }
                  ]
                : [
                    { label: 'Compra de Insumos', value: 'gasto_insumos' },
                    { label: 'Gastos de Limpieza', value: 'gasto_limpieza' },
                    { label: 'Adelanto de Sueldo', value: 'sueldo_adelanto' },
                    { label: 'Retiro de Caja (Caja Chica)', value: 'retiro_caja' },
                    { label: 'Otro', value: 'otro' }
                  ]
            }
            value={txCategory}
            onChange={(e: any) => setTxCategory(e.target.value)}
          />

          <Input
            label="Notas / Descripción Detallada"
            type="text"
            required
            placeholder="Ej: Compra de champú protector o retiro para cambio..."
            value={txNotes}
            onChange={(e) => setTxNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button variant="ghost" type="button" onClick={() => setIsTxModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={submittingTx}>
              {submittingTx ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Registrando...</span>
                </>
              ) : (
                'Registrar Transacción'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CLOSE DAILY CASH REGISTER (ARQUEO Y CIERRE) */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Arqueo y Cierre de Caja Diaria"
        size="md"
      >
        <form onSubmit={handleCloseCaja} className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-lg flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-400">
              <span className="font-bold">Información de Cierre Ciego:</span> Al cerrar la caja diaria, se registrarán tus declaraciones físicas y se compararán contra las transacciones del sistema. 
              {userRoleIsStaff && " El sistema ocultará el arqueo esperado por seguridad."}
            </div>
          </div>

          {/* Theoretical closing metrics (Hidden for Staff - Blind Close) */}
          {!userRoleIsStaff && activeSession.summary && (
            <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-border-custom rounded-xl p-4 space-y-2 text-xs">
              <div className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide text-[10px]">Cifras Esperadas del Sistema</div>
              <div className="flex justify-between items-center py-1 border-b border-border-custom/50">
                <span className="text-zinc-500">Dinero Total Esperado (Caja + Digitales)</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-150">${activeSession.summary.expectedClosingBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500 font-medium">Efectivo Físico en Cajón</span>
                <span className="font-bold text-primary">${activeSession.summary.expectedCashInDrawer.toLocaleString()}</span>
              </div>
            </div>
          )}

          <Input
            label="Saldo Real Físico Contado"
            type="number"
            min="0"
            step="any"
            required
            placeholder="Ingrese el efectivo total contado en el cajón"
            value={actualClosingBalance}
            onChange={(e) => setActualClosingBalance(e.target.value)}
          />

          <Input
            label="Notas de Cierre / Diferencia de Arqueo"
            type="text"
            placeholder="Indicar observaciones en caso de diferencias en el conteo..."
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button variant="ghost" type="button" onClick={() => setIsCloseModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" type="submit" disabled={closingCaja}>
              {closingCaja ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Cerrando Caja...</span>
                </>
              ) : (
                'Finalizar Cierre y Arqueo'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* TIMELINE AUDIT MODAL */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title={`Auditoría y Bitácora de Caja - Sesión Finalizada`}
        size="lg"
      >
        {selectedAuditRegister && (
          <div className="space-y-6">
            {/* Header statistics info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-900/30 border border-border-custom p-4 rounded-xl">
              <div>
                <span className="block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Apertura</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{formatDateTime(selectedAuditRegister.opened_at)}</span>
              </div>
              
              <div>
                <span className="block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Cierre</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{formatDateTime(selectedAuditRegister.closed_at)}</span>
              </div>

              <div>
                <span className="block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Saldo Inicial</span>
                <span className="text-xs font-extrabold text-zinc-700 dark:text-zinc-200">${Number(selectedAuditRegister.opening_balance).toLocaleString()}</span>
              </div>

              <div>
                <span className="block text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Saldo Final Arqueado</span>
                <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-50">${Number(selectedAuditRegister.actual_closing_balance).toLocaleString()}</span>
              </div>
            </div>

            {/* Timeline Area */}
            <div className="relative border-l border-zinc-200 dark:border-zinc-800 pl-6 ml-4 space-y-6 max-h-[50vh] overflow-y-auto py-2">
              
              {/* Event 1: Open session */}
              <div className="relative">
                {/* Connector Dot */}
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">Apertura de Caja</span>
                    <span className="text-[10px] text-zinc-400 font-medium">{formatTimeOnly(selectedAuditRegister.opened_at)}</span>
                  </div>
                  <div className="text-xs text-zinc-550 dark:text-zinc-400 mt-1">
                    Caja abierta por <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {selectedAuditRegister.opened_by_user 
                        ? `${selectedAuditRegister.opened_by_user.first_name || ''} ${selectedAuditRegister.opened_by_user.last_name || ''}`.trim() || selectedAuditRegister.opened_by_user.email 
                        : 'Cajero'}
                    </span> con un saldo inicial de <span className="font-bold text-emerald-600 dark:text-emerald-400">${Number(selectedAuditRegister.opening_balance).toLocaleString()}</span>.
                  </div>
                  {selectedAuditRegister.notes && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/20 p-2 border border-border-custom rounded-md mt-1.5 text-[11px] text-zinc-500 italic">
                      "{selectedAuditRegister.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Loader for transactions loading */}
              {loadingAudit ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Cargando bitácora de transacciones...</span>
                </div>
              ) : auditTransactions.length === 0 ? (
                <div className="text-xs text-zinc-450 dark:text-zinc-500 py-3 italic">
                  No se registraron transacciones financieras durante esta sesión de caja.
                </div>
              ) : (
                auditTransactions.map((tx) => {
                  const txOperator = tx.user 
                    ? `${tx.user.first_name || ''} ${tx.user.last_name || ''}`.trim() || tx.user.email?.split('@')[0]
                    : 'Sistema'

                  const isInc = tx.type === 'income'
                  
                  return (
                    <div key={tx.id} className="relative">
                      {/* Dot icon */}
                      <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-xs ${
                        isInc ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}>
                        {isInc ? (
                          <ArrowUp className="w-2.5 h-2.5 text-white" />
                        ) : (
                          <ArrowDown className="w-2.5 h-2.5 text-white" />
                        )}
                      </div>

                      <div className="bg-white dark:bg-card-custom/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 p-3 border border-border-custom/75 rounded-lg shadow-2xs">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-250">
                                {isInc ? 'Ingreso registrado' : 'Egreso / Retiro registrado'}
                              </span>
                              <span className="text-[10px] text-zinc-400">{formatTimeOnly(tx.created_at)}</span>
                            </div>
                            
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                              Operador: <span className="font-semibold text-zinc-700 dark:text-zinc-350">{txOperator}</span> • Concepto: <span className="font-semibold">{categoryLabels[tx.category] || tx.category}</span> • Método: <span className="font-medium text-zinc-650 dark:text-zinc-400">{methodLabels[tx.payment_method]}</span>
                            </div>

                            {tx.notes && (
                              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/40 p-1.5 rounded border border-border-custom mt-2 italic">
                                "{tx.notes}"
                              </p>
                            )}
                          </div>

                          <div className={`text-xs font-extrabold text-right ${
                            isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isInc ? '+' : '-'}${Number(tx.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Event Last: Close session */}
              <div className="relative">
                {/* Connector Dot */}
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-rose-600 border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-xs">
                  <XCircle className="w-2.5 h-2.5 text-white" />
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">Arqueo y Cierre de Caja</span>
                    <span className="text-[10px] text-zinc-400 font-medium">{formatTimeOnly(selectedAuditRegister.closed_at || '')}</span>
                  </div>
                  
                  <div className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 space-y-1.5">
                    <div>
                      Cerrado por <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {selectedAuditRegister.closed_by_user 
                          ? `${selectedAuditRegister.closed_by_user.first_name || ''} ${selectedAuditRegister.closed_by_user.last_name || ''}`.trim() || selectedAuditRegister.closed_by_user.email 
                          : 'Cajero'}
                      </span>.
                    </div>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-border-custom rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs mt-2">
                      <div>
                        <span className="block text-[9px] text-zinc-500 uppercase tracking-wide font-semibold">Esperado Sistema</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">${Number(selectedAuditRegister.expected_closing_balance || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-zinc-500 uppercase tracking-wide font-semibold">Físico Contado</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">${Number(selectedAuditRegister.actual_closing_balance || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-zinc-500 uppercase tracking-wide font-semibold">Diferencia</span>
                        {(() => {
                          const discrepancy = Number(selectedAuditRegister.actual_closing_balance || 0) - Number(selectedAuditRegister.expected_closing_balance || 0)
                          if (discrepancy === 0) {
                            return <span className="font-bold text-emerald-600 dark:text-emerald-400">Exacto</span>
                          } else if (discrepancy < 0) {
                            return <span className="font-bold text-rose-600 dark:text-rose-400">-${Math.abs(discrepancy).toLocaleString()}</span>
                          } else {
                            return <span className="font-bold text-amber-600 dark:text-amber-500">+${discrepancy.toLocaleString()}</span>
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                  {selectedAuditRegister.notes && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/20 p-2 border border-border-custom rounded-md mt-2.5 text-[11px] text-zinc-500 italic">
                      "{selectedAuditRegister.notes}"
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-border-custom">
              <Button variant="outline" onClick={() => setIsAuditModalOpen(false)}>
                Cerrar Bitácora
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}