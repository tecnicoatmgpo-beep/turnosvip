-- =========================================================================
-- MIGRACIÓN: HABILITAR TIEMPO REAL (SUPABASE REALTIME) EN TURNOS
-- Ejecutar esta sentencia una sola vez en la consola SQL de Supabase
-- (Supabase Dashboard -> SQL Editor -> New Query)
-- =========================================================================

-- 1. Configurar REPLICA IDENTITY FULL para que los eventos de UPDATE y DELETE
--    incluyan los datos completos de la fila anterior (necesario para Realtime)
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

-- 2. Agregar la tabla appointments a la publicación de Supabase Realtime
--    para que los cambios se transmitan en tiempo real al frontend
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
