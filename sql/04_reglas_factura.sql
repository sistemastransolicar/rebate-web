/* =====================================================================
   Condiciones de FACTURA migradas desde la medida DAX BIDescuentoFactura
   del modelo DASHBOARD_REBATE_FINAL (leido el 2026-09-05).

   Orden del SWITCH -> campo Prioridad (menor = se evalua antes).
   Ejecutar DESPUES de 01_schema_dbRebate.sql
   ===================================================================== */
USE dbRebate;
GO

/* Limpia solo las condiciones de factura, por si se re-ejecuta */
DELETE FROM Rebate_ReglaRuta
 WHERE IdRegla IN (SELECT IdRegla FROM Rebate_Regla WHERE Ambito = 'FACTURA');
DELETE FROM Rebate_Regla WHERE Ambito = 'FACTURA';
GO

DECLARE @id INT;

/* ---- 10. MINAS Nemocon->Santa Marta ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MINAS Nemocon->Santa Marta', '832004332', 10, '2025-10-28', '2025-11-30',
   NULL, NULL, 'POR_TONELADA', 5000, 1, 'SWITCH pos.1', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'NEMOCON', 'IGUAL', 'SANTA MARTA', 'IGUAL');
/* ---- 20. MINAS Cucunuba->Santa Marta ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MINAS Cucunuba->Santa Marta', '832004332', 20, '2025-12-04', NULL,
   NULL, NULL, 'POR_TONELADA', 2000, 1, 'SWITCH pos.2', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'CUCUNUBA', 'IGUAL', 'SANTA MARTA', 'IGUAL');
/* ---- 30. MINAS Cucunuba->Barranquilla ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MINAS Cucunuba->Barranquilla', '832004332', 30, '2026-01-28', NULL,
   NULL, NULL, 'POR_TONELADA', 2000, 1, 'SWITCH pos.3', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'CUCUNUBA', 'IGUAL', 'BARRANQUILLA', 'IGUAL');
/* ---- 40. CALABRESA Cimitarra->Santa Marta 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'CALABRESA Cimitarra->Santa Marta 2025', '901518289', 40, '2025-05-06', '2025-08-31',
   NULL, NULL, 'POR_TONELADA', 5000, 1, 'SWITCH pos.4', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'CIMITARRA', 'IGUAL', 'SANTA MARTA', 'IGUAL');
/* ---- 50. CALABRESA Cimitarra->Santa Marta 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'CALABRESA Cimitarra->Santa Marta 2026', '901518289', 50, '2026-02-01', NULL,
   NULL, NULL, 'POR_TONELADA', 5000, 1, 'SWITCH pos.5', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'CIMITARRA', 'IGUAL', 'SANTA MARTA', 'IGUAL');
/* ---- 60. MILPA may-jul 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MILPA may-jul 2025', '860513970', 60, '2025-05-19', '2025-07-31',
   NULL, NULL, 'FIJO', 340000, 1, 'SWITCH pos.6 - destino SITIONUEVO PALERMO', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'GUACHETA', 'IGUAL', 'SITIONUEVO PALERMO', 'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'CARTAGENA', 'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'SITIONUEVO PALERMO', 'CONTIENE'),
  (@id, 'SOCHA', 'IGUAL', 'SITIONUEVO PALERMO', 'CONTIENE'),
  (@id, 'SAMACA', 'IGUAL', 'SITIONUEVO PALERMO', 'CONTIENE'),
  (@id, 'GUACHETA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'SOCHA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'SAMACA', 'IGUAL', 'CARTAGENA', 'IGUAL');
/* ---- 70. MILPA oct-nov 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MILPA oct-nov 2025', '860513970', 70, '2025-10-16', '2025-11-16',
   NULL, NULL, 'FIJO', 170000, 1, 'SWITCH pos.7', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'GUACHETA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'CARTAGENA', 'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'SOCHA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'SAMACA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'GUACHETA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'SOCHA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'SAMACA', 'IGUAL', 'CARTAGENA', 'IGUAL');
/* ---- 80. MILPA ene-feb 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MILPA ene-feb 2026', '860513970', 80, '2026-01-17', '2026-02-02',
   NULL, NULL, 'FIJO', 102000, 1, 'SWITCH pos.8', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'GUACHETA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'CARTAGENA', 'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'SOCHA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'SAMACA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'GUACHETA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'SOCHA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'SAMACA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'RAQUIRA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'RAQUIRA', 'IGUAL', 'SITIONUEVO', 'CONTIENE');
/* ---- 90. MILPA 3 y 4 feb 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MILPA 3 y 4 feb 2026', '860513970', 90, '2026-02-03', '2026-02-04',
   NULL, NULL, 'FIJO', 204000, 1, 'SWITCH pos.9', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'GUACHETA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'CARTAGENA', 'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'SOCHA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'SAMACA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'GUACHETA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'SOCHA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'SAMACA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'RAQUIRA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'RAQUIRA', 'IGUAL', 'SITIONUEVO', 'CONTIENE');
/* ---- 100. MILPA feb-jun 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MILPA feb-jun 2026', '860513970', 100, '2026-02-05', '2026-06-30',
   NULL, NULL, 'FIJO', 364000, 1, 'SWITCH pos.10', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'GUACHETA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'SOCHA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'SAMACA', 'IGUAL', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'GUACHETA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'SOCHA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'SAMACA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'RAQUIRA', 'IGUAL', 'CARTAGENA', 'IGUAL'),
  (@id, 'RAQUIRA', 'IGUAL', 'SITIONUEVO', 'CONTIENE');
/* ---- 110. MILPA Cucunuba may-jun 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MILPA Cucunuba may-jun 2026', '860513970', 110, '2026-05-01', '2026-06-30',
   NULL, NULL, 'FIJO', 300000, 1, 'SWITCH pos.11 - cualquier destino', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'CUCUNUBA', 'IGUAL', NULL, 'IGUAL');
/* ---- 120. MILPA ->Barranquilla jun 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MILPA ->Barranquilla jun 2026', '860513970', 120, '2026-06-01', '2026-06-30',
   NULL, NULL, 'FIJO', 364000, 1, 'SWITCH pos.12', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'GUACHETA', 'IGUAL', 'BARRANQUILLA', 'IGUAL'),
  (@id, 'SAMACA', 'IGUAL', 'BARRANQUILLA', 'IGUAL'),
  (@id, 'SOCHA', 'IGUAL', 'BARRANQUILLA', 'IGUAL');
/* ---- 130. MILPA Lenguazaque jun 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MILPA Lenguazaque jun 2026', '860513970', 130, '2026-06-01', '2026-06-30',
   NULL, NULL, 'FIJO', 300000, 1, 'SWITCH pos.13', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'LENGUAZAQUE', 'IGUAL', NULL, 'IGUAL');
/* ---- 140. MILPA Lenguazaque desde jul 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MILPA Lenguazaque desde jul 2026', '860513970', 140, '2026-07-01', NULL,
   NULL, NULL, 'FIJO', 384000, 1, 'SWITCH pos.16 - antes que la de 445.000', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'LENGUAZAQUE', 'IGUAL', NULL, 'IGUAL');
/* ---- 150. MILPA por origen desde jul 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'MILPA por origen desde jul 2026', '860513970', 150, '2026-07-01', NULL,
   NULL, NULL, 'FIJO', 445000, 1, 'SWITCH pos.14,15,17,18,19 unificadas', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'CUCUNUBA', 'IGUAL', NULL, 'IGUAL'),
  (@id, 'GUACHETA', 'IGUAL', NULL, 'IGUAL'),
  (@id, 'RAQUIRA', 'IGUAL', NULL, 'IGUAL'),
  (@id, 'SAMACA', 'IGUAL', NULL, 'IGUAL'),
  (@id, 'SOCHA', 'IGUAL', NULL, 'IGUAL');
/* ---- 200. FLAME jun-sep 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FACTURA', 'FLAME jun-sep 2025', '901703487', 200, '2025-06-06', '2025-09-05',
   NULL, NULL, 'POR_TONELADA', 2000, 1, 'SWITCH pos.20', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'SAMACA', 'IGUAL', 'DIBULLA', 'CONTIENE'),
  (@id, 'TAUSA', 'IGUAL', 'DIBULLA', 'CONTIENE'),
  (@id, 'SUTATAUSA', 'IGUAL', 'DIBULLA', 'CONTIENE'),
  (@id, 'SOCHA', 'IGUAL', 'DIBULLA', 'CONTIENE'),
  (@id, 'GUACHETA', 'IGUAL', 'DIBULLA', 'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'DIBULLA', 'IGUAL'),
  (@id, 'NOBSA', 'IGUAL', 'DIBULLA', 'IGUAL'),
  (@id, 'PAZ DEL RIO', 'IGUAL', 'DIBULLA', 'IGUAL'),
  (@id, 'LENGUAZAQUE', 'IGUAL', 'DIBULLA', 'CONTIENE'),
  (@id, 'SAMACA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE'),
  (@id, 'TAUSA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE'),
  (@id, 'SUTATAUSA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE'),
  (@id, 'SOCHA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE'),
  (@id, 'GUACHETA', 'IGUAL', 'BARRANQUILLA', 'IGUAL'),
  (@id, 'CUCUNUBA', 'IGUAL', 'BARRANQUILLA', 'IGUAL');
GO

/* Verificacion */
SELECT r.Prioridad, r.Nombre, r.NitCliente,
       CONVERT(varchar(10), r.VigenteDesde, 23) AS Desde,
       CONVERT(varchar(10), r.VigenteHasta, 23) AS Hasta,
       r.TipoCalculo, r.Valor,
       (SELECT COUNT(*) FROM Rebate_ReglaRuta x WHERE x.IdRegla = r.IdRegla) AS Rutas
FROM Rebate_Regla r
WHERE r.Ambito = 'FACTURA'
ORDER BY r.Prioridad;
