-- =========================================================================
-- FASE 10: CONFIGURACIÓN DE DATOS DEL COMERCIO Y TICKET DE COBRO
-- =========================================================================

-- 1. Agregar columnas de datos del comercio a la tabla tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS cuit TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS activity_start_date TEXT;

-- 2. Asegurar políticas RLS para la tabla tenants
-- Permitir lectura de tenants a todos los usuarios autenticados
DROP POLICY IF EXISTS "Allow authenticated read access to tenants" ON public.tenants;
CREATE POLICY "Allow authenticated read access to tenants"
    ON public.tenants
    FOR SELECT
    USING (true); -- El catálogo de comercios y su info básica es legible públicamente para login/slug routing

-- Permitir actualización a administradores de su propio comercio y superadmins
DROP POLICY IF EXISTS "Tenant admins can update their own tenant details" ON public.tenants;
CREATE POLICY "Tenant admins can update their own tenant details"
    ON public.tenants
    FOR UPDATE
    USING (
        (id = public.get_user_tenant_id() AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() AND users.role = 'tenant_admin'::public.user_role
        ))
        OR public.is_superadmin()
    )
    WITH CHECK (
        (id = public.get_user_tenant_id() AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() AND users.role = 'tenant_admin'::public.user_role
        ))
        OR public.is_superadmin()
    );
