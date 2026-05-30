-- =========================================================================
-- SOLUCIÓN DE RECURSIÓN INFINITA EN POLÍTICAS RLS (INICIO DE SESIÓN)
-- =========================================================================

-- 1. Redefinir la función is_superadmin para obtener el rol directamente del JWT
-- Esto evita hacer consultas SELECT en public.users y elimina la recursión.
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        COALESCE(
            (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin',
            FALSE
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Redefinir la función get_user_tenant_id para obtener el tenant directamente del JWT
-- Esto también evita hacer consultas SELECT en public.users dentro de las políticas de RLS.
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        COALESCE(
            (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid,
            NULL
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Limpiar y recrear las políticas sobre la tabla public.users para estar 100% seguros
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read other users in same tenant" ON public.users;
DROP POLICY IF EXISTS "Tenant admins can manage users in same tenant" ON public.users;

-- A. Permitir leer el propio perfil
CREATE POLICY "Users can read their own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- B. Permitir leer perfiles del mismo comercio
CREATE POLICY "Users can read other users in same tenant"
    ON public.users
    FOR SELECT
    USING (tenant_id = public.get_user_tenant_id() OR public.is_superadmin());

-- C. Permitir administración para administradores del tenant
CREATE POLICY "Tenant admins can manage users in same tenant"
    ON public.users
    FOR ALL
    USING (
        (tenant_id = public.get_user_tenant_id() AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'tenant_admin') 
        OR public.is_superadmin()
    )
    WITH CHECK (
        (tenant_id = public.get_user_tenant_id() AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'tenant_admin') 
        OR public.is_superadmin()
    );
