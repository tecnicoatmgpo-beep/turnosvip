-- =========================================================================
-- FASE 11: MIGRACIÓN PARA ASOCIACIÓN DE PRODUCTOS A TURNOS DE AGENDA
-- =========================================================================

-- 1. Agregar columnas product_id y product_qty a la tabla appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS product_qty INTEGER CHECK (product_qty > 0) DEFAULT 1;

-- 2. Crear índice de performance para product_id en la tabla appointments
CREATE INDEX IF NOT EXISTS idx_appointments_product ON public.appointments(product_id);
