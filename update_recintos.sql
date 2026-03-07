-- Borrar los recintos dummy anteriores
DELETE FROM recintos WHERE nombre IN ('Colegio Nacional Simón Bolívar', 'Escuela Eduardo Abaroa');

-- Insertar los nuevos recintos
INSERT INTO recintos (nombre, ubicacion, total_mesas) VALUES
('jose melchor cuadros', 'Sin especificar', 10),
('martin cardenas', 'Sin especificar', 10),
('sagrada familia', 'Sin especificar', 10),
('ue anocaraire', 'Sin especificar', 10),
('david arzabe', 'Sin especificar', 10),
('avelino merida', 'Sin especificar', 10);
