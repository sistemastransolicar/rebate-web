/* =====================================================================
   Condiciones de FLETE - resto de clientes y reglas generales
   Generado por scripts/generar-reglas-flete.py desde la medida DAX
   BIDescuentoFlete (DASHBOARD_REBATE_FINAL, leida 2026-09-07).

   NO EDITAR A MANO: cambia el .py y vuelve a generar.

   El orden del SWITCH se conserva en la columna Prioridad. MILPA y la
   regla de vehiculo propio estan en 06_reglas_flete_milpa.sql.
   Ejecutar DESPUES de 05_esquema_flete.sql y 06_reglas_flete_milpa.sql
   ===================================================================== */
USE dbRebate;
GO

/* Re-ejecutable: borra solo lo que carga este script */
DELETE FROM Rebate_ReglaRuta
 WHERE IdRegla IN (SELECT IdRegla FROM Rebate_Regla
                    WHERE Ambito = 'FLETE' AND Prioridad >= 2000);
DELETE FROM Rebate_Regla WHERE Ambito = 'FLETE' AND Prioridad >= 2000;
GO

DECLARE @id INT;

/* ---- 2000. CALABRESA Cimitarra->Santa Marta ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'CALABRESA Cimitarra->Santa Marta', '901518289', 2000, '2025-05-06', NULL,
   1, NULL, 'PORCENTAJE', 0.08, 0.06, NULL, 1, 'SWITCH rama 2', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CIMITARRA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2010. Grupo 7% (901524301) ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'Grupo 7% (901524301)', '901524301', 2010, '2025-09-04', NULL,
   1, NULL, 'PORCENTAJE', 0.07, NULL, NULL, 1, 'SWITCH rama 3', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUTA', 'IGUAL', 'GAMARRA', 'IGUAL', 1),
  (@id, 'BOCHALEMA', 'IGUAL', 'GAMARRA', 'IGUAL', 1);

/* ---- 2020. Grupo 7% (900857481) ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'Grupo 7% (900857481)', '900857481', 2020, '2025-09-04', NULL,
   1, NULL, 'PORCENTAJE', 0.07, NULL, NULL, 1, 'SWITCH rama 3', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUTA', 'IGUAL', 'GAMARRA', 'IGUAL', 1),
  (@id, 'BOCHALEMA', 'IGUAL', 'GAMARRA', 'IGUAL', 1);

/* ---- 2030. Grupo 7% (900808399) ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'Grupo 7% (900808399)', '900808399', 2030, '2025-09-04', NULL,
   1, NULL, 'PORCENTAJE', 0.07, NULL, NULL, 1, 'SWITCH rama 3', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUTA', 'IGUAL', 'GAMARRA', 'IGUAL', 1),
  (@id, 'BOCHALEMA', 'IGUAL', 'GAMARRA', 'IGUAL', 1);

/* ---- 2040. Grupo 7% (901508279) ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'Grupo 7% (901508279)', '901508279', 2040, '2025-09-04', NULL,
   1, NULL, 'PORCENTAJE', 0.07, NULL, NULL, 1, 'SWITCH rama 3', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUTA', 'IGUAL', 'GAMARRA', 'IGUAL', 1),
  (@id, 'BOCHALEMA', 'IGUAL', 'GAMARRA', 'IGUAL', 1);

/* ---- 2050. PRETENSADOS 11,01% ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'PRETENSADOS 11,01%', '890209207', 2050, '2025-06-01', '2026-02-01',
   1, NULL, 'PORCENTAJE', 0.1101, NULL, NULL, 1, 'SWITCH rama 4a', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'PIEDECUESTA', 'IGUAL', 'CARTAGENA', 'IGUAL', 0);

/* ---- 2060. PRETENSADOS feb 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'PRETENSADOS feb 2026', '890209207', 2060, '2026-02-02', '2026-02-28',
   1, NULL, 'PORCENTAJE', 0.08, 0.06, NULL, 1, 'SWITCH rama 4b', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'PIEDECUESTA', 'IGUAL', 'CARTAGENA', 'IGUAL', 0);

/* ---- 2070. PRETENSADOS desde mar 2026 (flete - 4.240.000) ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'PRETENSADOS desde mar 2026 (flete - 4.240.000)', '890209207', 2070, '2026-03-01', NULL,
   1, NULL, 'FLETE_MENOS_FIJO', 4240000.0, NULL, NULL, 1, 'SWITCH rama 4c', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'PIEDECUESTA', 'IGUAL', 'CARTAGENA', 'IGUAL', 0);

/* ---- 2080. FLAME Dibulla estricta ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Dibulla estricta', '901703487', 2080, '2025-06-06', '2025-09-04',
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME 5.1', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SUTATAUSA', 'IGUAL', 'DIBULLA', 'CONTIENE', 0),
  (@id, 'NOBSA', 'IGUAL', 'DIBULLA', 'CONTIENE', 0),
  (@id, 'PAZ DE RIO', 'IGUAL', 'DIBULLA', 'CONTIENE', 0);

/* ---- 2090. FLAME Dibulla/Barranquilla afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Dibulla/Barranquilla afiliado', '901703487', 2090, '2025-06-06', '2025-09-04',
   1, NULL, 'PORCENTAJE', 0.08, NULL, NULL, 1, 'FLAME 5.2 afiliado', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SAMACA', 'IGUAL', 'DIBULLA', 'CONTIENE', 0),
  (@id, 'TAUSA', 'IGUAL', 'DIBULLA', 'CONTIENE', 0),
  (@id, 'GUACHETA', 'IGUAL', 'DIBULLA', 'CONTIENE', 0),
  (@id, 'CUCUNUBA', 'IGUAL', 'DIBULLA', 'IGUAL', 0),
  (@id, 'LENGUAZAQUE', 'IGUAL', 'DIBULLA', 'CONTIENE', 0),
  (@id, 'SAMACA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE', 0),
  (@id, 'TAUSA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE', 0),
  (@id, 'SUTATAUSA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE', 0),
  (@id, 'SOCHA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE', 0),
  (@id, 'GUACHETA', 'IGUAL', 'BARRANQUILLA', 'IGUAL', 0),
  (@id, 'CUCUNUBA', 'IGUAL', 'BARRANQUILLA', 'IGUAL', 0);

/* ---- 2100. FLAME Dibulla/Barranquilla no afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Dibulla/Barranquilla no afiliado', '901703487', 2100, '2025-06-06', '2025-09-04',
   0, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME 5.2 no afiliado', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SAMACA', 'IGUAL', 'DIBULLA', 'CONTIENE', 0),
  (@id, 'TAUSA', 'IGUAL', 'DIBULLA', 'CONTIENE', 0),
  (@id, 'GUACHETA', 'IGUAL', 'DIBULLA', 'CONTIENE', 0),
  (@id, 'CUCUNUBA', 'IGUAL', 'DIBULLA', 'IGUAL', 0),
  (@id, 'LENGUAZAQUE', 'IGUAL', 'DIBULLA', 'CONTIENE', 0),
  (@id, 'SAMACA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE', 0),
  (@id, 'TAUSA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE', 0),
  (@id, 'SUTATAUSA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE', 0),
  (@id, 'SOCHA', 'IGUAL', 'BARRANQUILLA', 'CONTIENE', 0),
  (@id, 'GUACHETA', 'IGUAL', 'BARRANQUILLA', 'IGUAL', 0),
  (@id, 'CUCUNUBA', 'IGUAL', 'BARRANQUILLA', 'IGUAL', 0);

/* ---- 2110. FLAME Sutatausa->La Dorada ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Sutatausa->La Dorada', '901703487', 2110, '2026-03-07', '2026-04-13',
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME 5.3', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SUTATAUSA', 'IGUAL', 'LA DORADA', 'IGUAL', 0);

/* ---- 2120. FLAME Socha->La Dorada mar-abr ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Socha->La Dorada mar-abr', '901703487', 2120, '2026-03-23', '2026-04-09',
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME 5.4', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SOCHA', 'IGUAL', 'LA DORADA', 'IGUAL', 0);

/* ---- 2130. FLAME Cucunuba->La Dorada afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Cucunuba->La Dorada afiliado', '901703487', 2130, '2026-06-20', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, 'FLAME 5.5', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUNUBA', 'IGUAL', 'LA DORADA', 'IGUAL', 0);

/* ---- 2140. FLAME Cucunuba->La Dorada ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Cucunuba->La Dorada', '901703487', 2140, '2026-03-04', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME 5.6', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUNUBA', 'IGUAL', 'LA DORADA', 'IGUAL', 0);

/* ---- 2150. FLAME Sardinata->Aguachica Buturama ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Sardinata->Aguachica Buturama', '901703487', 2150, '2026-05-02', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SARDINATA', 'IGUAL', 'AGUACHICA BUTURAMA', 'IGUAL', 0);

/* ---- 2160. FLAME Socha->Aguachica Buturama ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Socha->Aguachica Buturama', '901703487', 2160, '2026-05-12', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SOCHA', 'IGUAL', 'AGUACHICA BUTURAMA', 'IGUAL', 0);

/* ---- 2170. FLAME Sardinata->Santa Marta ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Sardinata->Santa Marta', '901703487', 2170, '2026-06-26', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SARDINATA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2180. FLAME Tausa->La Dorada ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Tausa->La Dorada', '901703487', 2180, '2026-07-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'TAUSA', 'IGUAL', 'LA DORADA', 'IGUAL', 0);

/* ---- 2190. FLAME Paz de Rio->La Dorada ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Paz de Rio->La Dorada', '901703487', 2190, '2026-06-12', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'PAZ DE RIO', 'IGUAL', 'LA DORADA', 'IGUAL', 0);

/* ---- 2200. FLAME destino Aguachica Buturama ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME destino Aguachica Buturama', '901703487', 2200, '2026-04-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 0, 'reactivada 2026-09-08 (estaba comentada en el DAX)', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, NULL, 'IGUAL', 'AGUACHICA BUTURAMA', 'IGUAL', 0);

/* ---- 2210. FLAME Guacheta->Aguachica Buturama ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Guacheta->Aguachica Buturama', '901703487', 2210, '2026-05-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.065, NULL, NULL, 1, 'FLAME - hoy queda tapada por la regla anterior', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'GUACHETA', 'IGUAL', 'AGUACHICA BUTURAMA', 'IGUAL', 0);

/* ---- 2220. FLAME Socha->La Dorada desde may ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME Socha->La Dorada desde may', '901703487', 2220, '2026-05-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SOCHA', 'IGUAL', 'LA DORADA', 'IGUAL', 0);

/* ---- 2230. FLAME afiliado desde sep 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME afiliado desde sep 2025', '901703487', 2230, '2025-09-05', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, 'FLAME 5.8', 'migracion-dax');

/* ---- 2240. FLAME general ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FLAME general', '901703487', 2240, NULL, NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'FLAME 5.9', 'migracion-dax');

/* ---- 2250. FINCA Barranquilla->Buga 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FINCA Barranquilla->Buga 2025', '860004828', 2250, '2025-09-17', '2026-01-02',
   NULL, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'BARRANQUILLA', 'IGUAL', 'GUADALAJARA DE BUGA', 'IGUAL', 0);

/* ---- 2260. FINCA Barranquilla->Buga desde ene 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FINCA Barranquilla->Buga desde ene 2026', '860004828', 2260, '2026-01-03', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'BARRANQUILLA', 'IGUAL', 'GUADALAJARA DE BUGA', 'IGUAL', 0);

/* ---- 2270. YILCOQUE desde ago 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'YILCOQUE desde ago 2026', '900614334', 2270, '2026-08-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.08, NULL, NULL, 1, '', 'migracion-dax');

/* ---- 2280. YILCOQUE mar-jul 2026 afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'YILCOQUE mar-jul 2026 afiliado', '900614334', 2280, '2026-03-01', '2026-07-31',
   1, NULL, 'PORCENTAJE', 0.08, 0.06, NULL, 1, '', 'migracion-dax');

/* ---- 2290. YILCOQUE oct 2025-feb 2026 afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'YILCOQUE oct 2025-feb 2026 afiliado', '900614334', 2290, '2025-10-06', '2026-02-28',
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');

/* ---- 2300. BULK Landazuri->Gamarra ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'BULK Landazuri->Gamarra', '900226684', 2300, '2026-03-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'LANDAZURI', 'IGUAL', 'GAMARRA', 'IGUAL', 0);

/* ---- 2310. BULK Socha->La Dorada ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'BULK Socha->La Dorada', '900226684', 2310, '2026-03-23', '2026-04-09',
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SOCHA', 'IGUAL', 'LA DORADA', 'IGUAL', 0);

/* ---- 2320. BULK destino Aguachica Buturama ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'BULK destino Aguachica Buturama', '900226684', 2320, '2026-03-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, NULL, 'IGUAL', 'AGUACHICA BUTURAMA', 'IGUAL', 0);

/* ---- 2330. BULK destino Gamarra ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'BULK destino Gamarra', '900226684', 2330, '2026-03-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, NULL, 'IGUAL', 'GAMARRA', 'IGUAL', 0);

/* ---- 2340. BULK Cimitarra->Dibulla Mingueo may 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'BULK Cimitarra->Dibulla Mingueo may 2026', '900226684', 2340, '2026-05-01', '2026-05-31',
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'en el DAX: >=1may y <1jun', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CIMITARRA', 'IGUAL', 'DIBULLA MINGUEO', 'IGUAL', 0);

/* ---- 2350. BULK Cimitarra->Dibulla Mingueo desde jun ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'BULK Cimitarra->Dibulla Mingueo desde jun', '900226684', 2350, '2026-06-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.065, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CIMITARRA', 'IGUAL', 'DIBULLA MINGUEO', 'IGUAL', 0);

/* ---- 2360. BULK El Zulia->Dibulla Mingueo ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'BULK El Zulia->Dibulla Mingueo', '900226684', 2360, '2026-05-13', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'EL ZULIA', 'IGUAL', 'DIBULLA MINGUEO', 'IGUAL', 0);

/* ---- 2370. BULK Landazuri->Dibulla Mingueo ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'BULK Landazuri->Dibulla Mingueo', '900226684', 2370, '2026-05-02', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'LANDAZURI', 'IGUAL', 'DIBULLA MINGUEO', 'IGUAL', 0);

/* ---- 2380. BULK afiliado desde oct 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'BULK afiliado desde oct 2025', '900226684', 2380, '2025-10-06', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');

/* ---- 2390. TRAFIGURA Cimitarra->Santa Marta ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'TRAFIGURA Cimitarra->Santa Marta', '900777972', 2390, '2026-05-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CIMITARRA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2400. TRAFIGURA Cucuta->Barranquilla may-jun ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'TRAFIGURA Cucuta->Barranquilla may-jun', '900777972', 2400, '2026-05-25', '2026-06-30',
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUTA', 'IGUAL', 'BARRANQUILLA', 'IGUAL', 0);

/* ---- 2410. TRAFIGURA Cucuta->Barranquilla desde jul ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'TRAFIGURA Cucuta->Barranquilla desde jul', '900777972', 2410, '2026-07-01', NULL,
   1, NULL, 'PORCENTAJE', 0.065, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUTA', 'IGUAL', 'BARRANQUILLA', 'IGUAL', 0);

/* ---- 2420. TRAFIGURA Pamplona->Santa Marta ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'TRAFIGURA Pamplona->Santa Marta', '900777972', 2420, '2026-05-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'PAMPLONA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2430. TRAFIGURA El Zulia->Santa Marta ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'TRAFIGURA El Zulia->Santa Marta', '900777972', 2430, '2026-06-30', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'EL ZULIA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2440. TRAFIGURA Bochalema->Santa Marta ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'TRAFIGURA Bochalema->Santa Marta', '900777972', 2440, '2026-06-10', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'BOCHALEMA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2450. TRAFIGURA Paz de Rio->La Dorada ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'TRAFIGURA Paz de Rio->La Dorada', '900777972', 2450, '2026-06-13', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'PAZ DE RIO', 'IGUAL', 'LA DORADA', 'IGUAL', 0);

/* ---- 2460. TRAFIGURA Sardinata->Santa Marta ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'TRAFIGURA Sardinata->Santa Marta', '900777972', 2460, '2026-05-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SARDINATA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2470. TRAFIGURA Cucuta->Santa Marta afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'TRAFIGURA Cucuta->Santa Marta afiliado', '900777972', 2470, '2026-07-01', NULL,
   1, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUTA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2480. TRAFIGURA afiliado desde oct 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'TRAFIGURA afiliado desde oct 2025', '900777972', 2480, '2025-10-06', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');

/* ---- 2490. LCC afiliado desde oct 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'LCC afiliado desde oct 2025', '900540901', 2490, '2025-10-06', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');

/* ---- 2500. CARBONES ANDINOS nov25-feb26 afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'CARBONES ANDINOS nov25-feb26 afiliado', '830142761', 2500, '2025-11-20', '2026-02-01',
   1, NULL, 'PORCENTAJE', 0.05, 0.06, NULL, 1, 'ojo: el preferencial (6%) es MAYOR que el normal (5%)', 'migracion-dax');

/* ---- 2510. CARBONES ANDINOS nov25-feb26 no afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'CARBONES ANDINOS nov25-feb26 no afiliado', '830142761', 2510, '2025-11-20', '2026-02-01',
   0, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');

/* ---- 2520. CARBONES ANDINOS desde feb 2026 afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'CARBONES ANDINOS desde feb 2026 afiliado', '830142761', 2520, '2026-02-02', NULL,
   1, NULL, 'PORCENTAJE', 0.08, 0.06, NULL, 1, '', 'migracion-dax');

/* ---- 2530. CARBONES ANDINOS desde feb 2026 no afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'CARBONES ANDINOS desde feb 2026 no afiliado', '830142761', 2530, '2026-02-02', NULL,
   0, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');

/* ---- 2540. FRONTIER NEXT afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FRONTIER NEXT afiliado', '802022622', 2540, '2025-09-01', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 0, 'reactivada 2026-09-08 (estaba comentada en el DAX)', 'migracion-dax');

/* ---- 2550. FRONTIER NEXT no afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FRONTIER NEXT no afiliado', '802022622', 2550, '2025-09-01', NULL,
   0, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 0, 'reactivada 2026-09-08 (estaba comentada en el DAX)', 'migracion-dax');

/* ---- 2560. MINAS Puerto Libertador->Santiago de Tolu ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINAS Puerto Libertador->Santiago de Tolu', '832004332', 2560, NULL, NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'sin fecha en el DAX', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'PUERTO LIBERTADOR', 'IGUAL', 'SANTIAGO DE TOLU', 'IGUAL', 0);

/* ---- 2570. MINEX IND. Cartagena->Barranquilla ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINEX IND. Cartagena->Barranquilla', '901424783', 2570, NULL, NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'sin fecha en el DAX', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CARTAGENA', 'IGUAL', 'BARRANQUILLA', 'IGUAL', 0);

/* ---- 2580. MINEX CIA Cartagena->Barranquilla ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINEX CIA Cartagena->Barranquilla', '900114676', 2580, '2026-05-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CARTAGENA', 'IGUAL', 'BARRANQUILLA', 'IGUAL', 0);

/* ---- 2590. MINEX CIA afiliado desde dic 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINEX CIA afiliado desde dic 2025', '900114676', 2590, '2025-12-01', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');

/* ---- 2600. MINEX IND. afiliado desde dic 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINEX IND. afiliado desde dic 2025', '901424783', 2600, '2025-12-01', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');

/* ---- 2610. MINEX IND. no afiliado desde dic 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINEX IND. no afiliado desde dic 2025', '901424783', 2610, '2025-12-01', NULL,
   0, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');

/* ---- 2620. DS GROUP Cimitarra->Santa Marta ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'DS GROUP Cimitarra->Santa Marta', '901526048', 2620, '2026-06-12', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CIMITARRA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2630. DS GROUP Cimitarra->La Dorada ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'DS GROUP Cimitarra->La Dorada', '901526048', 2630, '2026-06-12', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CIMITARRA', 'IGUAL', 'LA DORADA', 'IGUAL', 0);

/* ---- 2640. DS GROUP Cimitarra->Ibague ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'DS GROUP Cimitarra->Ibague', '901526048', 2640, '2026-07-28', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CIMITARRA', 'IGUAL', 'IBAGUE', 'IGUAL', 0);

/* ---- 2650. DS GROUP resto desde may 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'DS GROUP resto desde may 2026', '901526048', 2650, '2026-05-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.08, NULL, NULL, 1, '', 'migracion-dax');

/* ---- 2660. MINAS Cucunuba->Santa Marta afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINAS Cucunuba->Santa Marta afiliado', '832004332', 2660, '2025-12-05', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUNUBA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2670. MINAS Cucunuba->Santa Marta no afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINAS Cucunuba->Santa Marta no afiliado', '832004332', 2670, '2025-12-05', NULL,
   0, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUNUBA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2680. MINAS Nemocon->Santa Marta afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINAS Nemocon->Santa Marta afiliado', '832004332', 2680, '2025-10-29', NULL,
   1, NULL, 'PORCENTAJE', 0.08, 0.06, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'NEMOCON', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2690. MINAS Nemocon->Santa Marta no afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINAS Nemocon->Santa Marta no afiliado', '832004332', 2690, '2025-10-29', NULL,
   0, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'NEMOCON', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2700. MINAS Villa de San Diego->Santa Marta afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINAS Villa de San Diego->Santa Marta afiliado', '832004332', 2700, '2025-10-28', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'VILLA DE SAN DIEGO DE U', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2710. MINAS Villa de San Diego->Santa Marta no afiliado ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINAS Villa de San Diego->Santa Marta no afiliado', '832004332', 2710, '2025-10-28', NULL,
   0, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'VILLA DE SAN DIEGO DE U', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2720. MINAS Cucunuba->Barranquilla ene-feb 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINAS Cucunuba->Barranquilla ene-feb 2026', '832004332', 2720, '2026-01-28', '2026-02-01',
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUNUBA', 'IGUAL', 'BARRANQUILLA', 'IGUAL', 0);

/* ---- 2730. MINAS Cucunuba->Barranquilla desde feb 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINAS Cucunuba->Barranquilla desde feb 2026', '832004332', 2730, '2026-02-02', NULL,
   NULL, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'CUCUNUBA', 'IGUAL', 'BARRANQUILLA', 'IGUAL', 0);

/* ---- 2740. MINAS Guacheta->Santa Marta desde mar 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'MINAS Guacheta->Santa Marta desde mar 2026', '832004332', 2740, '2026-03-01', NULL,
   NULL, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'GUACHETA', 'IGUAL', 'SANTA MARTA', 'IGUAL', 0);

/* ---- 2750. FORTIA El Zulia->Aguachica Buturama ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FORTIA El Zulia->Aguachica Buturama', '800023551', 2750, '2026-07-22', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'fecha corregida el 2026-09-07', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'EL ZULIA', 'IGUAL', 'AGUACHICA BUTURAMA', 'IGUAL', 0);

/* ---- 2760. FORTIA afiliado desde nov 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'FORTIA afiliado desde nov 2025', '800023551', 2760, '2025-11-01', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');

/* ---- 2770. TRANCORA afiliado desde sep 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'TRANCORA afiliado desde sep 2025', '900073066', 2770, '2025-09-04', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');

/* ---- 2780. CALES Y CARBONES afiliado desde dic 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'CALES Y CARBONES afiliado desde dic 2025', '900901630', 2780, '2025-12-01', NULL,
   1, NULL, 'PORCENTAJE', 0.065, 0.06, NULL, 1, '', 'migracion-dax');

/* ---- 2790. ALBATEQ origen Santa Marta feb-mar 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'ALBATEQ origen Santa Marta feb-mar 2026', '800149149', 2790, '2026-02-01', '2026-03-07',
   NULL, NULL, 'PORCENTAJE', 0.08, 0.06, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SANTA MARTA', 'IGUAL', NULL, 'IGUAL', 0);

/* ---- 2800. ALBATEQ origen Santa Marta desde mar 2026 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'ALBATEQ origen Santa Marta desde mar 2026', '800149149', 2800, '2026-03-08', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, '', 'migracion-dax');
SET @id = SCOPE_IDENTITY();
INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES
  (@id, 'SANTA MARTA', 'IGUAL', NULL, 'IGUAL', 0);

/* ---- 9000. General 2,6% ene 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'General 2,6% ene 2025', NULL, 9000, '2025-01-01', '2025-01-26',
   NULL, NULL, 'PORCENTAJE', 0.026, NULL, NULL, 1, 'regla general', 'migracion-dax');

/* ---- 9010. General 2,7% desde 27 ene 2025 ---- */
INSERT INTO Rebate_Regla
  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
   ValorAdicional, Activo, Observacion, CreadoPor)
VALUES
  ('FLETE', 'General 2,7% desde 27 ene 2025', NULL, 9010, '2025-01-27', NULL,
   NULL, NULL, 'PORCENTAJE', 0.027, NULL, NULL, 1, 'regla general', 'migracion-dax');

GO

SELECT Prioridad, NitCliente, Nombre, TipoCalculo, Valor, ValorPoseedorPref,
       ValorAdicional, RequiereAfiliado, VigenteDesde, VigenteHasta,
       (SELECT COUNT(*) FROM Rebate_ReglaRuta t WHERE t.IdRegla = r.IdRegla AND t.Excluir = 0) AS Rutas,
       (SELECT COUNT(*) FROM Rebate_ReglaRuta t WHERE t.IdRegla = r.IdRegla AND t.Excluir = 1) AS Excluidas
FROM Rebate_Regla r WHERE Ambito = 'FLETE'
ORDER BY Prioridad;
GO