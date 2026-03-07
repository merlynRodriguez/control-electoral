-- Limpiar la tabla de recintos (con CASCADE activado en foreign keys, borrará mesas y actas dependientes)
TRUNCATE TABLE recintos CASCADE;

-- Insertar los nuevos recintos con sus números exactos
INSERT INTO recintos (nombre, ubicacion, total_mesas) VALUES
('escuela melchor cuadros', 'Sin especificar', 33),
('martin cardenas', 'Sin especificar', 23),
('sagrada familia', 'Sin especificar', 16),
('david arzabe', 'Sin especificar', 16),
('avelino merida', 'Sin especificar', 8);
