-- Migration: Add business hours and blocked dates to tenants table
-- Run this in the Supabase SQL Editor

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '[
    {"day": 1, "label": "Lunes",      "open": true,  "start": "09:00", "end": "18:00"},
    {"day": 2, "label": "Martes",     "open": true,  "start": "09:00", "end": "18:00"},
    {"day": 3, "label": "Miércoles",  "open": true,  "start": "09:00", "end": "18:00"},
    {"day": 4, "label": "Jueves",     "open": true,  "start": "09:00", "end": "18:00"},
    {"day": 5, "label": "Viernes",    "open": true,  "start": "09:00", "end": "18:00"},
    {"day": 6, "label": "Sábado",     "open": true,  "start": "09:00", "end": "14:00"},
    {"day": 0, "label": "Domingo",    "open": false, "start": "09:00", "end": "14:00"}
  ]',
  ADD COLUMN IF NOT EXISTS blocked_dates JSONB DEFAULT '[]';

-- Backfill existing rows that still have NULL
UPDATE public.tenants
SET
  business_hours = '[
    {"day": 1, "label": "Lunes",      "open": true,  "start": "09:00", "end": "18:00"},
    {"day": 2, "label": "Martes",     "open": true,  "start": "09:00", "end": "18:00"},
    {"day": 3, "label": "Miércoles",  "open": true,  "start": "09:00", "end": "18:00"},
    {"day": 4, "label": "Jueves",     "open": true,  "start": "09:00", "end": "18:00"},
    {"day": 5, "label": "Viernes",    "open": true,  "start": "09:00", "end": "18:00"},
    {"day": 6, "label": "Sábado",     "open": true,  "start": "09:00", "end": "14:00"},
    {"day": 0, "label": "Domingo",    "open": false, "start": "09:00", "end": "14:00"}
  ]',
  blocked_dates = '[]'
WHERE business_hours IS NULL;
