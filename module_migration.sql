-- =========================================================================
-- FASE 3: MIGRACIÓN DE MÓDULOS ACTIVOS POR COMERCIO
-- =========================================================================

-- 1. Agregar columna JSONB a public.tenants para guardar la configuración de módulos habilitados
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS enabled_modules JSONB 
DEFAULT '{"agenda": true, "servicios": true, "staff": true, "statistics": false, "marketing": false, "whatsapp": false}'::jsonb;

-- 2. Actualizar registros existentes para tener la configuración por defecto según su plan
-- a. Plan Básico/Essential (Slug: 'essential')
UPDATE public.tenants
SET enabled_modules = '{"agenda": true, "servicios": true, "staff": true, "statistics": false, "marketing": false, "whatsapp": false}'::jsonb
WHERE plan_id IN (SELECT id FROM public.subscription_plans WHERE slug = 'essential');

-- b. Plan Profesional/Pro (Slug: 'pro')
UPDATE public.tenants
SET enabled_modules = '{"agenda": true, "servicios": true, "staff": true, "statistics": true, "marketing": false, "whatsapp": false}'::jsonb
WHERE plan_id IN (SELECT id FROM public.subscription_plans WHERE slug = 'pro');

-- c. Plan Premium/Vip (Slug: 'vip')
UPDATE public.tenants
SET enabled_modules = '{"agenda": true, "servicios": true, "staff": true, "statistics": true, "marketing": true, "whatsapp": true}'::jsonb
WHERE plan_id IN (SELECT id FROM public.subscription_plans WHERE slug = 'vip');
