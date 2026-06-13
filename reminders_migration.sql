-- ============================================================
-- appointment_reminders: tabla de recordatorios de WhatsApp
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id   UUID        NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type    TEXT        NOT NULL CHECK (reminder_type IN ('24h', '2h')),
  client_name      TEXT        NOT NULL DEFAULT '',
  client_phone     TEXT        NOT NULL DEFAULT '',
  service_name     TEXT        NOT NULL DEFAULT '',
  appointment_time TIMESTAMPTZ NOT NULL,
  message_text     TEXT        NOT NULL DEFAULT '',
  wa_url           TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped')),
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, reminder_type)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reminders_tenant ON public.appointment_reminders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status  ON public.appointment_reminders (status);
CREATE INDEX IF NOT EXISTS idx_reminders_appt    ON public.appointment_reminders (appointment_time DESC);

-- RLS
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_select_reminders"
  ON public.appointment_reminders FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "tenant_members_update_reminders"
  ON public.appointment_reminders FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));
