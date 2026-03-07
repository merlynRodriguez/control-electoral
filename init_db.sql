-- 1. Crear tabla de recintos
CREATE TABLE IF NOT EXISTS recintos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  ubicacion TEXT,
  total_mesas INTEGER NOT NULL DEFAULT 0
);

-- 2. Crear tabla de mesas
CREATE TABLE IF NOT EXISTS mesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_mesa INTEGER NOT NULL,
  recinto_id UUID NOT NULL REFERENCES recintos(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Escrutada')),
  UNIQUE(recinto_id, numero_mesa)
);

-- 3. Crear tabla de perfiles (roles)
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'veedor')),
  recinto_id UUID REFERENCES recintos(id) ON DELETE SET NULL
);

-- 4. Crear tabla de actas
CREATE TABLE IF NOT EXISTS actas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id UUID NOT NULL UNIQUE REFERENCES mesas(id) ON DELETE CASCADE,
  veedor_id UUID NOT NULL REFERENCES perfiles(id),
  timestamp TIMESTAMPTZ DEFAULT now(),
  c_1 INTEGER NOT NULL DEFAULT 0,
  c_2 INTEGER NOT NULL DEFAULT 0,
  c_3 INTEGER NOT NULL DEFAULT 0,
  c_4 INTEGER NOT NULL DEFAULT 0,
  c_5 INTEGER NOT NULL DEFAULT 0,
  c_6 INTEGER NOT NULL DEFAULT 0,
  c_7 INTEGER NOT NULL DEFAULT 0,
  c_8 INTEGER NOT NULL DEFAULT 0,
  c_9 INTEGER NOT NULL DEFAULT 0,
  c_10 INTEGER NOT NULL DEFAULT 0,
  c_11 INTEGER NOT NULL DEFAULT 0,
  c_12 INTEGER NOT NULL DEFAULT 0,
  blancos INTEGER NOT NULL DEFAULT 0,
  nulos INTEGER NOT NULL DEFAULT 0,
  total_votos INTEGER NOT NULL DEFAULT 0,
  foto_url TEXT
);

-- 5. Habilitar Realtime para actas y mesas
alter publication supabase_realtime add table actas;
alter publication supabase_realtime add table mesas;

-- 6. Configurar RLS (Row Level Security) - Políticas Simplificadas para desarrollo
ALTER TABLE recintos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE actas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de recintos" ON recintos FOR SELECT USING (true);
CREATE POLICY "Lectura pública de mesas" ON mesas FOR SELECT USING (true);
CREATE POLICY "Admins pueden todo en mesas" ON mesas FOR ALL USING (true);
CREATE POLICY "Veedores pueden actualizar estado de mesa" ON mesas FOR UPDATE USING (true);
CREATE POLICY "Lectura pública de perfiles" ON perfiles FOR SELECT USING (true);
CREATE POLICY "Lectura pública de actas" ON actas FOR SELECT USING (true);
CREATE POLICY "Veedores pueden insertar actas" ON actas FOR INSERT WITH CHECK (true);

-- Insertar Datos Dummy de Prueba
INSERT INTO recintos (nombre, ubicacion, total_mesas) VALUES 
('Colegio Nacional Simón Bolívar', 'Zona Central', 5),
('Escuela Eduardo Abaroa', 'Zona Sur', 3);

-- Asumiendo que recintos obtuvieron IDs, un admin debería correr un script para popular las mesas (ej: 1 al 5).
