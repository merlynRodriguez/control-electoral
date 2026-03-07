-- Script para permitir guardar actas de forma anónima durante el desarrollo/pruebas.
-- Esto quita la obligatoriedad de tener un veedor con sesión iniciada.

ALTER TABLE actas DROP CONSTRAINT IF EXISTS actas_veedor_id_fkey;
ALTER TABLE actas ALTER COLUMN veedor_id DROP NOT NULL;
