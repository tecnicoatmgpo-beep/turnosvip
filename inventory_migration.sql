-- =========================================================================
-- FASE 9: MIGRACIÓN PARA MÓDULO DE INVENTARIO Y CONTROL DE STOCK
-- =========================================================================

-- 1. Tabla de Catálogo de Productos
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT, -- Código de barras o SKU del producto
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Capilares', -- Capilares, Faciales, Corporal, Insumo, etc.
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
    sale_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (sale_price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    supplier TEXT, -- Proveedor
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Movimientos e Historial de Stock (Auditoría)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id), -- Operador que realizó el movimiento
    type TEXT NOT NULL CHECK (type IN ('input', 'output', 'adjustment')), -- input (ingreso), output (egreso/consumo/venta), adjustment (ajuste manual)
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    previous_stock INTEGER NOT NULL CHECK (previous_stock >= 0),
    new_stock INTEGER NOT NULL CHECK (new_stock >= 0),
    reason TEXT NOT NULL, -- "Venta POS", "Compra Proveedor", "Rotura", "Uso Interno", etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enlazar la tabla sales con la tabla products
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant ON public.stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);

-- SEGURIDAD A NIVEL DE FILAS (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE RLS PARA PRODUCTOS
DROP POLICY IF EXISTS "Tenants can manage their own products" ON public.products;
CREATE POLICY "Tenants can manage their own products"
    ON public.products
    FOR ALL
    USING (tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
    WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_superadmin());

-- POLÍTICAS DE RLS PARA MOVIMIENTOS DE STOCK
DROP POLICY IF EXISTS "Tenants can manage their own stock movements" ON public.stock_movements;
CREATE POLICY "Tenants can manage their own stock movements"
    ON public.stock_movements
    FOR ALL
    USING (tenant_id = public.get_user_tenant_id() OR public.is_superadmin())
    WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_superadmin());
