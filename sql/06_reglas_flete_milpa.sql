/* =====================================================================
   Condiciones de FLETE - cliente de prueba MILPA (Nit 860513970)
   Migradas desde la medida DAX BIDescuentoFlete del modelo
   DASHBOARD_REBATE_FINAL (leida el 2026-09-07).

   El SWITCH anidado de MILPA tiene 13 ramas y el orden entre ellas
   importa: por ejemplo, en julio de 2026 la ruta CARTAGENA->BARRANQUILLA
   paga 2,7% (rama 10) y NO 2,7%+445.000 (rama 11), porque la 10 se
   evalua antes. Ese orden es el campo Prioridad.

   Ejecutar DESPUES de 05_esquema_flete.sql
   ===================================================================== */
USE dbRebate;
GO

/* Re-ejecutable: limpia solo lo que carga este script */
DELETE FROM Rebate_ReglaRuta
 WHERE IdRegla IN (SELECT IdRegla FROM Rebate_Regla
                    WHERE Ambito = 'FLETE'
                      AND (NitCliente = '860513970' OR Prioridad = 1));
DELETE FROM Rebate_Regla
 WHERE Ambito = 'FLETE' AND (NitCliente = '860513970' OR Prioridad = 1);
GO

DECLARE @id INT;

/* =====================================================================
   PRIORIDAD 1 - VEHICULO PROPIO, SIN DESCUENTO
   Es la primera rama del SWITCH del BI y aplica a todos los clientes.
   Se expresa como 0% sobre el flete.
   ===================================================================== */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'Vehiculo propio: sin descuento', NULL, 1, NULL, NULL,
   NULL, 'PROPIO', 'PORCENTAJE', 0, 1, 'SWITCH rama 1 (global)', 'migracion-dax');

/* =====================================================================
   MILPA 860513970
   ===================================================================== */

/* ---- 1000. CIMITARRA -> GUACHETA, 2,7% hasta el 01-feb-2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA Cimitarra->Guacheta', '860513970', 1000, '2025-10-16', '2026-02-01',
   NULL, NULL, 'PORCENTAJE', 0.027, 1, 'MILPA prioridad especial', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'CIMITARRA', 'IGUAL', 'GUACHETA', 'IGUAL');

/* ---- 1010 / 1011. nov-2025 a ene-2026: afiliado 6,5% | no afiliado 2,7% ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA nov25-ene26 afiliado', '860513970', 1010, '2025-11-26', '2026-01-18',
   1, NULL, 'PORCENTAJE', 0.065, 0.06, 1, 'MILPA 4.0', 'migracion-dax');
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA nov25-ene26 no afiliado', '860513970', 1011, '2025-11-26', '2026-01-18',
   0, NULL, 'PORCENTAJE', 0.027, 1, 'MILPA 4.0', 'migracion-dax');

/* ---- 1020. 19 al 31 may-2025, afiliado, 7 rutas, 8% ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA 19-31 may 2025', '860513970', 1020, '2025-05-19', '2025-05-31',
   1, NULL, 'PORCENTAJE', 0.08, 0.06, 1, 'MILPA 4.1', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'GUACHETA', 'IGUAL',    'SITIONUEVO', 'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL',    'SITIONUEVO', 'CONTIENE'),
  (@id, 'SOCHA',    'IGUAL',    'SITIONUEVO', 'CONTIENE'),
  (@id, 'SAMACA',   'CONTIENE', 'SITIONUEVO', 'CONTIENE'),
  (@id, 'GUACHETA', 'IGUAL',    'CARTAGENA',  'IGUAL'),
  (@id, 'SOCHA',    'IGUAL',    'CARTAGENA',  'IGUAL'),
  (@id, 'SAMACA',   'IGUAL',    'CARTAGENA',  'IGUAL');

/* ---- 1030. 01 jun a 03 sep 2025, afiliado, 9 rutas, 8% ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA jun-sep 2025', '860513970', 1030, '2025-06-01', '2025-09-03',
   1, NULL, 'PORCENTAJE', 0.08, 0.06, 1, 'MILPA 4.2', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'GUACHETA', 'IGUAL', 'SITIONUEVO',   'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'CARTAGENA',    'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'SITIONUEVO',   'CONTIENE'),
  (@id, 'SOCHA',    'IGUAL', 'SITIONUEVO',   'CONTIENE'),
  (@id, 'SAMACA',   'IGUAL', 'SITIONUEVO',   'CONTIENE'),
  (@id, 'GUACHETA', 'IGUAL', 'CARTAGENA',    'IGUAL'),
  (@id, 'SOCHA',    'IGUAL', 'CARTAGENA',    'IGUAL'),
  (@id, 'SAMACA',   'IGUAL', 'BARRANQUILLA', 'IGUAL'),
  (@id, 'SAMACA',   'IGUAL', 'CARTAGENA',    'IGUAL');

/* ---- 1040. 04 sep a 15 oct 2025, afiliado, mismas 9 rutas, 6,5% ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA sep-oct 2025', '860513970', 1040, '2025-09-04', '2025-10-15',
   1, NULL, 'PORCENTAJE', 0.065, 0.06, 1, 'MILPA 4.3', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'GUACHETA', 'IGUAL', 'SITIONUEVO',   'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'CARTAGENA',    'CONTIENE'),
  (@id, 'CUCUNUBA', 'IGUAL', 'SITIONUEVO',   'CONTIENE'),
  (@id, 'SOCHA',    'IGUAL', 'SITIONUEVO',   'CONTIENE'),
  (@id, 'SAMACA',   'IGUAL', 'SITIONUEVO',   'CONTIENE'),
  (@id, 'GUACHETA', 'IGUAL', 'CARTAGENA',    'IGUAL'),
  (@id, 'SOCHA',    'IGUAL', 'CARTAGENA',    'IGUAL'),
  (@id, 'SAMACA',   'IGUAL', 'BARRANQUILLA', 'IGUAL'),
  (@id, 'SAMACA',   'IGUAL', 'CARTAGENA',    'IGUAL');

/* ---- 1050. 16 oct a 13 nov 2025, afiliado, cualquier ruta, 8% ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA oct-nov 2025 afiliado', '860513970', 1050, '2025-10-16', '2025-11-13',
   1, NULL, 'PORCENTAJE', 0.08, 0.06, 1, 'MILPA 4.4', 'migracion-dax');

/* ---- 1060. 14 al 25 nov 2025, todos, 2,7% ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA 14-25 nov 2025', '860513970', 1060, '2025-11-14', '2025-11-25',
   NULL, NULL, 'PORCENTAJE', 0.027, 1, 'MILPA 4.5', 'migracion-dax');

/* ---- 1070. 19 y 20 ene 2026, afiliado, 8% ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA 19-20 ene 2026', '860513970', 1070, '2026-01-19', '2026-01-20',
   1, NULL, 'PORCENTAJE', 0.08, 0.06, 1, 'MILPA 4.6', 'migracion-dax');

/* ---- 1080. 21 ene a 01 feb 2026, afiliado, 6,5% ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA 21 ene - 01 feb 2026', '860513970', 1080, '2026-01-21', '2026-02-01',
   1, NULL, 'PORCENTAJE', 0.065, 0.06, 1, 'MILPA 4.7', 'migracion-dax');

/* ---- 1090. CARTAGENA -> BARRANQUILLA desde jun-2026, 2,7% ----
   Va ANTES de la 1100: en julio de 2026 esta ruta paga 2,7% y no lleva
   el alistamiento de 445.000. */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA Cartagena->Barranquilla', '860513970', 1090, '2026-06-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, 1, 'MILPA 4.8', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador) VALUES
  (@id, 'CARTAGENA', 'IGUAL', 'BARRANQUILLA', 'IGUAL');

/* ---- 1100. desde jul-2026: 2,7% + alistamiento de 445.000 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA desde jul 2026 (2,7% + alistamiento)', '860513970', 1100, '2026-07-01', NULL,
   NULL, NULL, 'PORCENTAJE_MAS_FIJO', 0.027, 445000, 1, 'MILPA 4.9', 'migracion-dax');

/* ---- 1110. desde 02 feb 2026, afiliado, 8% ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA desde feb 2026 afiliado', '860513970', 1110, '2026-02-02', NULL,
   1, NULL, 'PORCENTAJE', 0.08, 0.06, 1, 'MILPA 4.10', 'migracion-dax');

/* ---- 1120. resto de MILPA, 2,7% ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MILPA general', '860513970', 1120, NULL, NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, 1, 'MILPA caso general', 'migracion-dax');
GO

SELECT Prioridad, Nombre, TipoCalculo, Valor, ValorPoseedorPref, ValorAdicional,
       RequiereAfiliado, VigenteDesde, VigenteHasta,
       (SELECT COUNT(*) FROM Rebate_ReglaRuta t WHERE t.IdRegla = r.IdRegla) AS Rutas
FROM Rebate_Regla r
WHERE Ambito = 'FLETE'
ORDER BY Prioridad;
GO
