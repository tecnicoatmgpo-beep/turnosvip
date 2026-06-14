-- ============================================================
-- Agregar columna commission_pct a la tabla users
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS commission_pct DECIMAL(5,2) DEFAULT 0
  CHECK (commission_pct >= 0 AND commission_pct <= 100);

COMMENT ON COLUMN public.users.commission_pct IS 'Porcentaje de comisión del profesional (0-100)';
