-- =========================================================================
-- FASE 8: MIGRACIÓN PARA MÓDULO DE CAJA DIARIA Y TRANSACCIONES (POS)
-- =========================================================================

-- 1. Tabla de Sesiones de Caja (Caja Diaria)
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES public.users(id),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_by UUID REFERENCES public.users(id),
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0),
    expected_closing_balance NUMERIC(10, 2), -- Dinero que debería haber según sistema
    actual_closing_balance NUMERIC(10, 2),   -- Dinero físico real contado en arqueo
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Transacciones (Ingresos y Egresos vinculados a la Caja)
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id), -- Empleado que registró la transacción
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'mercadopago')),
    category TEXT NOT NULL CHECK (category IN ('servicio', 'producto', 'gasto_insumos', 'gasto_limpieza', 'sueldo_adelanto', 'retiro_caja', 'otro')),
    reference_id UUID, -- Opcional: ID de cita (appointments) o venta (sales)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant ON public.cash_registers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_register ON public.cash_transactions(register_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant ON public.cash_transactions(tenant_id);

-- SEGURIDAD A NIVEL DE FILAS (RLS)
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE RLS PARA SESIONES DE CAJA
DROP POLICY IF EXISTS "Tenants can manage their own cash registers" ON public.cash_registers;
CREATE POLICY "Tenants can manage their own cash registers"
    ON public.cash_registers
    FOR ALL
    USING (tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
    WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_superadmin());

-- POLÍTICAS DE RLS PARA TRANSACCIONES DE CAJA
DROP POLICY IF EXISTS "Tenants can manage their own cash transactions" ON public.cash_transactions;
CREATE POLICY "Tenants can manage their own cash transactions"
    ON public.cash_transactions
    FOR ALL
    USING (tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
    WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_superadmin());
