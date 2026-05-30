-- =========================================================================
-- FASE 6: MIGRACIÓN DE COLUMNAS DE PERFIL PARA PERSONAL DE EQUIPO (STAFF)
-- =========================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS personal_email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS locality TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS specialty TEXT;

-- =========================================================================
-- POLÍTICAS RLS MULTITENANT PARA LA TABLA PUBLIC.USERS
-- =========================================================================

-- Asegurar que RLS esté activo
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes para evitar colisiones
DROP POLICY IF EXISTS "Users can read other users in same tenant" ON public.users;
DROP POLICY IF EXISTS "Tenant admins can manage users in same tenant" ON public.users;

-- 1. Permitir que cualquier empleado lea la información de los otros empleados del mismo comercio
CREATE POLICY "Users can read other users in same tenant"
    ON public.users
    FOR SELECT
    USING (tenant_id = public.get_user_tenant_id() OR public.is_superadmin());

-- 2. Permitir que el Administrador de Salón gestione (modifique/elimine) perfiles de su propio comercio
CREATE POLICY "Tenant admins can manage users in same tenant"
    ON public.users
    FOR ALL
    USING (
        (tenant_id = public.get_user_tenant_id() AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'tenant_admin'
        )) OR public.is_superadmin()
    )
    WITH CHECK (
        (tenant_id = public.get_user_tenant_id() AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'tenant_admin'
        )) OR public.is_superadmin()
    );
