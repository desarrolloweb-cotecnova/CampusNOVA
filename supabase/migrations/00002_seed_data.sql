
-- ==========================================
-- CATEGORÍAS DE ACTIVOS
-- ==========================================
INSERT INTO public.categorias_activos (nombre) VALUES
('ESCRITORIO'), ('SILLAS'), ('CUADROS'), ('OBJETO'), ('MODULO'),
('HERRAMIENTA'), ('CAJA CON CONTENIDO'), ('MESAS'), ('ARCHIVADOR'),
('REVISTERO'), ('ESTANTERÍA'), ('CÁMARA IP'), ('REGULADOR DE VOLTAJE'),
('TABLERO'), ('EQUIPOS DE COMPUTO'), ('PUPITRE'), ('VITRINA'),
('RELOJES'), ('MICROSCOPIO'), ('MÓDULO');

-- ==========================================
-- ESPACIOS FÍSICOS INICIALES
-- ==========================================
INSERT INTO public.espacios_fisicos (codigo, nombre, sede, bloque, tipo, estado, habilitado_reserva, capacidad_personas) VALUES
('SP-BA-ADM-001', 'Biblioteca', 'Sede Principal', 'Bloque B', 'LAB', 'Bueno', true, 80),
('SP-BA-ADM-002', 'Oficina Investigación', 'Sede Principal', 'Bloque A', 'ADM', 'Bueno', false, 10),
('SP-BA-ADM-003', 'Oficina Talento Humano', 'Sede Principal', 'Bloque A', 'ADM', 'Bueno', false, 8),
('SP-BA-AUD-001', 'Auditorio 1', 'Sede Principal', 'Bloque A', 'AUD', 'Bueno', true, 200),
('SP-BA-ADM-004', 'Oficina Calidad', 'Sede Principal', 'Bloque A', 'ADM', 'Bueno', false, 6),
('SP-BA-ADM-005', 'Oficina Financiera', 'Sede Principal', 'Bloque A', 'ADM', 'Bueno', false, 8),
('SP-BA-LAB-001', 'Laboratorio Energías Renovables', 'Sede Principal', 'Bloque A', 'LAB', 'Bueno', true, 30),
('SP-BA-LAB-002', 'Laboratorio Electricidad', 'Sede Principal', 'Bloque A', 'LAB', 'Bueno', true, 25),
('SP-BC-SAL-001', 'Salón Cultural', 'Sede Principal', 'Bloque C', 'SAL', 'Bueno', true, 150),
('SP-BA-AUL-016', 'Aula A16', 'Sede Principal', 'Bloque A', 'AUL', 'Bueno', true, 35),
('SP-BA-AUL-011', 'Aula A11', 'Sede Principal', 'Bloque A', 'AUL', 'Bueno', true, 35),
('SP-BA-AUL-012', 'Aula A12', 'Sede Principal', 'Bloque A', 'AUL', 'Bueno', true, 35),
('SP-BA-AUL-002', 'Aula A2', 'Sede Principal', 'Bloque A', 'AUL', 'Bueno', true, 40),
('SP-BB-LAB-001', 'Laboratorio A', 'Sede Principal', 'Bloque B', 'LAB', 'Bueno', true, 30),
('SP-BB-LAB-002', 'Laboratorio B', 'Sede Principal', 'Bloque B', 'LAB', 'Bueno', true, 30),
('SP-BB-LAB-003', 'Laboratorio C', 'Sede Principal', 'Bloque B', 'LAB', 'Bueno', true, 30),
('SP-BB-LAB-004', 'Laboratorio de Idiomas', 'Sede Principal', 'Bloque B', 'LAB', 'Bueno', true, 25),
('SP-BB-LAB-005', 'Laboratorio Ciencias Básicas', 'Sede Principal', 'Bloque B', 'LAB', 'Bueno', true, 28),
('SP-BA-AUD-002', 'Auditorio Paraninfo', 'Sede Principal', 'Bloque A', 'AUD', 'Bueno', true, 300),
('SP-BA-ADM-006', 'Oficina Registro y Control', 'Sede Principal', 'Bloque A', 'ADM', 'Bueno', false, 8),
('SP-BA-ADM-007', 'Oficina Bienestar', 'Sede Principal', 'Bloque A', 'ADM', 'Bueno', false, 6),
('SP-BA-ADM-008', 'Oficina Dirección de Unidad', 'Sede Principal', 'Bloque A', 'ADM', 'Bueno', false, 10),
('SP-BC-BOD-001', 'Bodega Compartida', 'Sede Principal', 'Bloque C', 'BOD', 'Regular', false, 0),
('SP-BC-BOD-002', 'Bodega Bienestar', 'Sede Principal', 'Bloque C', 'BOD', 'Bueno', false, 0),
('SP-BC-BOD-003', 'Bodega Salón Cultural', 'Sede Principal', 'Bloque C', 'BOD', 'Bueno', false, 0),
('SP-BB-AUL-001', 'Aula B1', 'Sede Principal', 'Bloque B', 'AUL', 'Bueno', true, 35),
('SP-BB-AUL-004', 'Aula B4', 'Sede Principal', 'Bloque B', 'AUL', 'Bueno', true, 35);
