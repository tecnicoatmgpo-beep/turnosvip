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
