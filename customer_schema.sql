-- =========================================================================
-- FASE 5: ESQUEMA DE BASE DE DATOS PARA CLIENTES Y VENTAS DE PRODUCTOS
-- =========================================================================

-- 1. Tabla de Clientes (Fichas detalladas para estética/salones)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    birthday DATE,
    category TEXT NOT NULL CHECK (category IN ('nuevo', 'regular', 'frecuente', 'vip')) DEFAULT 'regular',
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    notes TEXT, -- Notas de estética (Tipo de piel, alergias a químicos, parámetros láser, etc.)
    address TEXT, -- Dirección
    locality TEXT, -- Localidad
    province TEXT, -- Provincia
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Ventas (Para registrar compra de productos como champús, cremas, etc.)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0) DEFAULT 1,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enlazar la tabla de citas con la tabla de clientes (customer_id)
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- =========================================================================
-- ÍNDICES DE PERFORMANCE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_id);

-- =========================================================================
-- POLÍTICAS DE SEGURIDAD RLS
-- =========================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Políticas para Clientes
CREATE POLICY "Tenants can manage their own customers"
    ON public.customers
    FOR ALL
    USING (tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
    WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_superadmin());

-- Políticas para Ventas de Productos
CREATE POLICY "Tenants can manage their own sales"
    ON public.sales
    FOR ALL
    USING (tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
    WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_superadmin());
