-- =========================================================================
-- FASE 2: ESQUEMA DE BASE DE DATOS OPERATIVO PARA COMERCIOS
-- =========================================================================

-- 1. Tabla de Servicios (Catálogo de servicios ofrecidos por cada comercio)
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Turnos / Reservas (Agenda de citas del comercio)
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    client_email TEXT,
    staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Empleado asignado
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL, -- Servicio contratado
    appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'canceled')) DEFAULT 'confirmed',
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla Relacional de Especialidades (Qué empleado hace qué servicios)
CREATE TABLE public.staff_services (
    staff_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    PRIMARY KEY (staff_id, service_id)
);

-- =========================================================================
-- ÍNDICES DE PERFORMANCE
-- =========================================================================
CREATE INDEX idx_services_tenant ON public.services(tenant_id);
CREATE INDEX idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX idx_appointments_time ON public.appointments(appointment_time);
CREATE INDEX idx_appointments_staff ON public.appointments(staff_id);

-- =========================================================================
-- POLITICAS DE SEGURIDAD RLS MULTITENANT
-- =========================================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener el tenant_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id FROM public.users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para Servicios
CREATE POLICY "Tenants can manage their own services"
    ON public.services
    FOR ALL
    USING (tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
    WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_superadmin());

-- Políticas para Turnos / Agenda
CREATE POLICY "Tenants can manage their own appointments"
    ON public.appointments
    FOR ALL
    USING (tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
    WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_superadmin());

-- Políticas para Especialidades de Staff
CREATE POLICY "Tenants can manage staff specialties"
    ON public.staff_services
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = staff_services.staff_id 
              AND (tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = staff_services.staff_id 
              AND (tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
        )
    );
