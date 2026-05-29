-- =========================================================================
-- FASE 1: ESQUEMA DE BASE DE DATOS Y RLS PARA SUPERADMINISTRADOR
-- =========================================================================

-- 1. Crear tipo enumerado para roles de usuario
CREATE TYPE public.user_role AS ENUM ('superadmin', 'tenant_admin', 'staff', 'customer');

-- 2. Tabla de Planes de Suscripción
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    billing_interval TEXT NOT NULL DEFAULT 'month',
    max_staff INTEGER,
    max_appointments_per_month INTEGER,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Tenants (Comercios/Salones)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'trial')) DEFAULT 'trial',
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    subscription_status TEXT NOT NULL CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'unpaid', 'trialing')) DEFAULT 'trialing',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Usuarios (Extensión de auth.users de Supabase)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role public.user_role NOT NULL DEFAULT 'customer',
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- =========================================================================
CREATE INDEX idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_subscription_plans_slug ON public.subscription_plans(slug);

-- =========================================================================
-- SEGURIDAD A NIVEL DE FILAS (Row Level Security - RLS)
-- =========================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Función de ayuda para determinar si el usuario actual es Superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        COALESCE(
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin',
            FALSE
        ) OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'superadmin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas de Acceso Exclusivo para Superadministradores
CREATE POLICY "Superadmin full access on users" 
    ON public.users 
    FOR ALL 
    USING (public.is_superadmin()) 
    WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmin full access on subscription_plans" 
    ON public.subscription_plans 
    FOR ALL 
    USING (public.is_superadmin()) 
    WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmin full access on tenants" 
    ON public.tenants 
    FOR ALL 
    USING (public.is_superadmin()) 
    WITH CHECK (public.is_superadmin());

-- =========================================================================
-- DISPARADORES (Triggers) PARA ENLACE CON AUTH.USERS
-- =========================================================================

-- Crear el perfil público de manera automática al registrarse en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role, tenant_id)
    VALUES (
        new.id,
        new.email,
        COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'customer'::public.user_role),
        (new.raw_user_meta_data->>'tenant_id')::uuid
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
