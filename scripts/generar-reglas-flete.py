# -*- coding: utf-8 -*-
"""
Genera sql/07_reglas_flete_resto.sql a partir de la medida DAX
BIDescuentoFlete (modelo DASHBOARD_REBATE_FINAL, leida 2026-09-07).

Las reglas se declaran abajo EN EL MISMO ORDEN del SWITCH del DAX. La
prioridad se asigna sola, de 10 en 10, para que ese orden se conserve:
es lo unico que garantiza que una ruta especifica gane sobre la regla
general del mismo cliente.

MILPA (860513970) y la de vehiculo propio NO estan aqui: van en
06_reglas_flete_milpa.sql, ya validadas contra el BI.
"""
import io

# --- atajos para las rutas: (origen, opOrigen, destino, opDestino) -----
def I(o, d):    return (o, 'IGUAL', d, 'IGUAL')          # origen y destino exactos
def IC(o, d):   return (o, 'IGUAL', d, 'CONTIENE')       # destino "contiene"
def CC(o, d):   return (o, 'CONTIENE', d, 'CONTIENE')
def DEST(d):    return (None, 'IGUAL', d, 'IGUAL')       # cualquier origen
def ORIG(o):    return (o, 'IGUAL', None, 'IGUAL')       # cualquier destino

# Condiciones que quedan CARGADAS PERO INACTIVAS (Activo = 0). Estan
# comentadas en el DAX; se dejan aqui para que existan y se puedan activar
# desde la plataforma sin volver a migrarlas, pero hoy no calculan nada y
# la plataforma sigue dando lo mismo que el BI.
INACTIVAS = {
    'FLAME destino Aguachica Buturama',   # taparia el 6,5% de Guacheta->Aguachica
    'FRONTIER NEXT afiliado',
    'FRONTIER NEXT no afiliado',
}

PCT, FIJO, TON = 'PORCENTAJE', 'FIJO', 'POR_TONELADA'
PCT_MAS = 'PORCENTAJE_MAS_FIJO'
MENOS   = 'FLETE_MENOS_FIJO'

# nombre, nit, desde, hasta, tipo, valor, pref, adicional, afiliado, rutas, excluidas, obs
REGLAS = [

 # ---- 901518289 CALABRESA ----
 ('CALABRESA Cimitarra->Santa Marta', '901518289', '2025-05-06', None, PCT, 0.08, 0.06, None, 1,
  [I('CIMITARRA','SANTA MARTA')], [], 'SWITCH rama 2'),

 # ---- grupo del 7%: cuatro NIT, todas las rutas SALVO dos ----
 ('Grupo 7% (901524301)', '901524301', '2025-09-04', None, PCT, 0.07, None, None, 1,
  [], [I('CUCUTA','GAMARRA'), I('BOCHALEMA','GAMARRA')], 'SWITCH rama 3'),
 ('Grupo 7% (900857481)', '900857481', '2025-09-04', None, PCT, 0.07, None, None, 1,
  [], [I('CUCUTA','GAMARRA'), I('BOCHALEMA','GAMARRA')], 'SWITCH rama 3'),
 ('Grupo 7% (900808399)', '900808399', '2025-09-04', None, PCT, 0.07, None, None, 1,
  [], [I('CUCUTA','GAMARRA'), I('BOCHALEMA','GAMARRA')], 'SWITCH rama 3'),
 ('Grupo 7% (901508279)', '901508279', '2025-09-04', None, PCT, 0.07, None, None, 1,
  [], [I('CUCUTA','GAMARRA'), I('BOCHALEMA','GAMARRA')], 'SWITCH rama 3'),

 # ---- 890209207 PRETENSADOS ----
 ('PRETENSADOS 11,01%', '890209207', '2025-06-01', '2026-02-01', PCT, 0.1101, None, None, 1,
  [I('PIEDECUESTA','CARTAGENA')], [], 'SWITCH rama 4a'),
 ('PRETENSADOS feb 2026', '890209207', '2026-02-02', '2026-02-28', PCT, 0.08, 0.06, None, 1,
  [I('PIEDECUESTA','CARTAGENA')], [], 'SWITCH rama 4b'),
 ('PRETENSADOS desde mar 2026 (flete - 4.240.000)', '890209207', '2026-03-01', None,
  MENOS, 4240000, None, None, 1, [I('PIEDECUESTA','CARTAGENA')], [], 'SWITCH rama 4c'),

 # ---- 901703487 FLAME ----
 ('FLAME Dibulla estricta', '901703487', '2025-06-06', '2025-09-04', PCT, 0.027, None, None, None,
  [IC('SUTATAUSA','DIBULLA'), IC('NOBSA','DIBULLA'), IC('PAZ DE RIO','DIBULLA')], [], 'FLAME 5.1'),
 ('FLAME Dibulla/Barranquilla afiliado', '901703487', '2025-06-06', '2025-09-04', PCT, 0.08, None, None, 1,
  [IC('SAMACA','DIBULLA'), IC('TAUSA','DIBULLA'), IC('GUACHETA','DIBULLA'),
   I('CUCUNUBA','DIBULLA'), IC('LENGUAZAQUE','DIBULLA'), IC('SAMACA','BARRANQUILLA'),
   IC('TAUSA','BARRANQUILLA'), IC('SUTATAUSA','BARRANQUILLA'), IC('SOCHA','BARRANQUILLA'),
   I('GUACHETA','BARRANQUILLA'), I('CUCUNUBA','BARRANQUILLA')], [], 'FLAME 5.2 afiliado'),
 ('FLAME Dibulla/Barranquilla no afiliado', '901703487', '2025-06-06', '2025-09-04', PCT, 0.027, None, None, 0,
  [IC('SAMACA','DIBULLA'), IC('TAUSA','DIBULLA'), IC('GUACHETA','DIBULLA'),
   I('CUCUNUBA','DIBULLA'), IC('LENGUAZAQUE','DIBULLA'), IC('SAMACA','BARRANQUILLA'),
   IC('TAUSA','BARRANQUILLA'), IC('SUTATAUSA','BARRANQUILLA'), IC('SOCHA','BARRANQUILLA'),
   I('GUACHETA','BARRANQUILLA'), I('CUCUNUBA','BARRANQUILLA')], [], 'FLAME 5.2 no afiliado'),
 ('FLAME Sutatausa->La Dorada', '901703487', '2026-03-07', '2026-04-13', PCT, 0.027, None, None, None,
  [I('SUTATAUSA','LA DORADA')], [], 'FLAME 5.3'),
 ('FLAME Socha->La Dorada mar-abr', '901703487', '2026-03-23', '2026-04-09', PCT, 0.027, None, None, None,
  [I('SOCHA','LA DORADA')], [], 'FLAME 5.4'),
 ('FLAME Cucunuba->La Dorada afiliado', '901703487', '2026-06-20', None, PCT, 0.065, 0.06, None, 1,
  [I('CUCUNUBA','LA DORADA')], [], 'FLAME 5.5'),
 ('FLAME Cucunuba->La Dorada', '901703487', '2026-03-04', None, PCT, 0.027, None, None, None,
  [I('CUCUNUBA','LA DORADA')], [], 'FLAME 5.6'),
 ('FLAME Sardinata->Aguachica Buturama', '901703487', '2026-05-02', None, PCT, 0.027, None, None, None,
  [I('SARDINATA','AGUACHICA BUTURAMA')], [], 'FLAME'),
 ('FLAME Socha->Aguachica Buturama', '901703487', '2026-05-12', None, PCT, 0.027, None, None, None,
  [I('SOCHA','AGUACHICA BUTURAMA')], [], 'FLAME'),
 ('FLAME Sardinata->Santa Marta', '901703487', '2026-06-26', None, PCT, 0.027, None, None, None,
  [I('SARDINATA','SANTA MARTA')], [], 'FLAME'),
 ('FLAME Tausa->La Dorada', '901703487', '2026-07-01', None, PCT, 0.027, None, None, None,
  [I('TAUSA','LA DORADA')], [], 'FLAME'),
 ('FLAME Paz de Rio->La Dorada', '901703487', '2026-06-12', None, PCT, 0.027, None, None, None,
  [I('PAZ DE RIO','LA DORADA')], [], 'FLAME'),
 # Estaba comentada en el DAX. Reactivada el 2026-09-08 a peticion del usuario.
 # Va en la posicion que tenia: ANTES de Guacheta->Aguachica, asi que la tapa
 # y esa ruta pasa de 6,5% a 2,7% (9 manifiestos de 2026, -$1.412.033).
 ('FLAME destino Aguachica Buturama', '901703487', '2026-04-01', None, PCT, 0.027, None, None, None,
  [DEST('AGUACHICA BUTURAMA')], [], 'reactivada 2026-09-08 (estaba comentada en el DAX)'),
 ('FLAME Guacheta->Aguachica Buturama', '901703487', '2026-05-01', None, PCT, 0.065, None, None, None,
  [I('GUACHETA','AGUACHICA BUTURAMA')], [], 'FLAME - hoy queda tapada por la regla anterior'),
 ('FLAME Socha->La Dorada desde may', '901703487', '2026-05-01', None, PCT, 0.027, None, None, None,
  [I('SOCHA','LA DORADA')], [], 'FLAME'),
 ('FLAME afiliado desde sep 2025', '901703487', '2025-09-05', None, PCT, 0.065, 0.06, None, 1,
  [], [], 'FLAME 5.8'),
 ('FLAME general', '901703487', None, None, PCT, 0.027, None, None, None, [], [], 'FLAME 5.9'),

 # ---- 860004828 FINCA ----
 ('FINCA Barranquilla->Buga 2025', '860004828', '2025-09-17', '2026-01-02', PCT, 0.065, 0.06, None, None,
  [I('BARRANQUILLA','GUADALAJARA DE BUGA')], [], ''),
 ('FINCA Barranquilla->Buga desde ene 2026', '860004828', '2026-01-03', None, PCT, 0.027, None, None, None,
  [I('BARRANQUILLA','GUADALAJARA DE BUGA')], [], ''),

 # ---- 900614334 YILCOQUE ----
 ('YILCOQUE desde ago 2026', '900614334', '2026-08-01', None, PCT, 0.08, None, None, None, [], [], ''),
 ('YILCOQUE mar-jul 2026 afiliado', '900614334', '2026-03-01', '2026-07-31', PCT, 0.08, 0.06, None, 1, [], [], ''),
 ('YILCOQUE oct 2025-feb 2026 afiliado', '900614334', '2025-10-06', '2026-02-28', PCT, 0.065, 0.06, None, 1, [], [], ''),

 # ---- 900226684 BULK TRADING ----
 ('BULK Landazuri->Gamarra', '900226684', '2026-03-01', None, PCT, 0.027, None, None, None,
  [I('LANDAZURI','GAMARRA')], [], ''),
 ('BULK Socha->La Dorada', '900226684', '2026-03-23', '2026-04-09', PCT, 0.027, None, None, None,
  [I('SOCHA','LA DORADA')], [], ''),
 ('BULK destino Aguachica Buturama', '900226684', '2026-03-01', None, PCT, 0.027, None, None, None,
  [DEST('AGUACHICA BUTURAMA')], [], ''),
 ('BULK destino Gamarra', '900226684', '2026-03-01', None, PCT, 0.027, None, None, None,
  [DEST('GAMARRA')], [], ''),
 ('BULK Cimitarra->Dibulla Mingueo may 2026', '900226684', '2026-05-01', '2026-05-31', PCT, 0.027, None, None, None,
  [I('CIMITARRA','DIBULLA MINGUEO')], [], 'en el DAX: >=1may y <1jun'),
 ('BULK Cimitarra->Dibulla Mingueo desde jun', '900226684', '2026-06-01', None, PCT, 0.065, None, None, None,
  [I('CIMITARRA','DIBULLA MINGUEO')], [], ''),
 ('BULK El Zulia->Dibulla Mingueo', '900226684', '2026-05-13', None, PCT, 0.027, None, None, None,
  [I('EL ZULIA','DIBULLA MINGUEO')], [], ''),
 ('BULK Landazuri->Dibulla Mingueo', '900226684', '2026-05-02', None, PCT, 0.027, None, None, None,
  [I('LANDAZURI','DIBULLA MINGUEO')], [], ''),
 ('BULK afiliado desde oct 2025', '900226684', '2025-10-06', None, PCT, 0.065, 0.06, None, 1, [], [], ''),

 # ---- 900777972 TRAFIGURA ----
 ('TRAFIGURA Cimitarra->Santa Marta', '900777972', '2026-05-01', None, PCT, 0.027, None, None, None,
  [I('CIMITARRA','SANTA MARTA')], [], ''),
 ('TRAFIGURA Cucuta->Barranquilla may-jun', '900777972', '2026-05-25', '2026-06-30', PCT, 0.027, None, None, None,
  [I('CUCUTA','BARRANQUILLA')], [], ''),
 ('TRAFIGURA Cucuta->Barranquilla desde jul', '900777972', '2026-07-01', None, PCT, 0.065, None, None, 1,
  [I('CUCUTA','BARRANQUILLA')], [], ''),
 ('TRAFIGURA Pamplona->Santa Marta', '900777972', '2026-05-01', None, PCT, 0.027, None, None, None,
  [I('PAMPLONA','SANTA MARTA')], [], ''),
 ('TRAFIGURA El Zulia->Santa Marta', '900777972', '2026-06-30', None, PCT, 0.027, None, None, None,
  [I('EL ZULIA','SANTA MARTA')], [], ''),
 ('TRAFIGURA Bochalema->Santa Marta', '900777972', '2026-06-10', None, PCT, 0.027, None, None, None,
  [I('BOCHALEMA','SANTA MARTA')], [], ''),
 ('TRAFIGURA Paz de Rio->La Dorada', '900777972', '2026-06-13', None, PCT, 0.027, None, None, None,
  [I('PAZ DE RIO','LA DORADA')], [], ''),
 ('TRAFIGURA Sardinata->Santa Marta', '900777972', '2026-05-01', None, PCT, 0.027, None, None, None,
  [I('SARDINATA','SANTA MARTA')], [], ''),
 ('TRAFIGURA Cucuta->Santa Marta afiliado', '900777972', '2026-07-01', None, PCT, 0.027, None, None, 1,
  [I('CUCUTA','SANTA MARTA')], [], ''),
 ('TRAFIGURA afiliado desde oct 2025', '900777972', '2025-10-06', None, PCT, 0.065, 0.06, None, 1, [], [], ''),

 # ---- 900540901 C I LCC ----
 ('LCC afiliado desde oct 2025', '900540901', '2025-10-06', None, PCT, 0.065, 0.06, None, 1, [], [], ''),

 # ---- 830142761 CARBONES ANDINOS ----
 ('CARBONES ANDINOS nov25-feb26 afiliado', '830142761', '2025-11-20', '2026-02-01', PCT, 0.05, 0.06, None, 1, [], [],
  'ojo: el preferencial (6%) es MAYOR que el normal (5%)'),
 ('CARBONES ANDINOS nov25-feb26 no afiliado', '830142761', '2025-11-20', '2026-02-01', PCT, 0.027, None, None, 0, [], [], ''),
 ('CARBONES ANDINOS desde feb 2026 afiliado', '830142761', '2026-02-02', None, PCT, 0.08, 0.06, None, 1, [], [], ''),
 ('CARBONES ANDINOS desde feb 2026 no afiliado', '830142761', '2026-02-02', None, PCT, 0.027, None, None, 0, [], [], ''),

 # ---- 802022622 FRONTIER NEXT ----
 # Estaba comentada en el DAX. Reactivada el 2026-09-08 a peticion del usuario.
 ('FRONTIER NEXT afiliado', '802022622', '2025-09-01', None, PCT, 0.065, 0.06, None, 1, [], [],
  'reactivada 2026-09-08 (estaba comentada en el DAX)'),
 ('FRONTIER NEXT no afiliado', '802022622', '2025-09-01', None, PCT, 0.027, None, None, 0, [], [],
  'reactivada 2026-09-08 (estaba comentada en el DAX)'),

 # ---- 832004332 ruta suelta, va ANTES del bloque grande de este NIT ----
 ('MINAS Puerto Libertador->Santiago de Tolu', '832004332', None, None, PCT, 0.027, None, None, None,
  [I('PUERTO LIBERTADOR','SANTIAGO DE TOLU')], [], 'sin fecha en el DAX'),

 # ---- 901424783 ruta suelta, va ANTES de su regla general ----
 ('MINEX IND. Cartagena->Barranquilla', '901424783', None, None, PCT, 0.027, None, None, None,
  [I('CARTAGENA','BARRANQUILLA')], [], 'sin fecha en el DAX'),

 # ---- 900114676 MINEX COMPANIA INTERNACIONAL ----
 ('MINEX CIA Cartagena->Barranquilla', '900114676', '2026-05-01', None, PCT, 0.027, None, None, None,
  [I('CARTAGENA','BARRANQUILLA')], [], ''),
 ('MINEX CIA afiliado desde dic 2025', '900114676', '2025-12-01', None, PCT, 0.065, 0.06, None, 1, [], [], ''),

 # ---- 901424783 MINEX INDUSTRIAL general ----
 ('MINEX IND. afiliado desde dic 2025', '901424783', '2025-12-01', None, PCT, 0.065, 0.06, None, 1, [], [], ''),
 ('MINEX IND. no afiliado desde dic 2025', '901424783', '2025-12-01', None, PCT, 0.027, None, None, 0, [], [], ''),

 # ---- 901526048 DS GROUP NS ----
 ('DS GROUP Cimitarra->Santa Marta', '901526048', '2026-06-12', None, PCT, 0.027, None, None, None,
  [I('CIMITARRA','SANTA MARTA')], [], ''),
 ('DS GROUP Cimitarra->La Dorada', '901526048', '2026-06-12', None, PCT, 0.027, None, None, None,
  [I('CIMITARRA','LA DORADA')], [], ''),
 ('DS GROUP Cimitarra->Ibague', '901526048', '2026-07-28', None, PCT, 0.027, None, None, None,
  [I('CIMITARRA','IBAGUE')], [], ''),
 ('DS GROUP resto desde may 2026', '901526048', '2026-05-01', None, PCT, 0.08, None, None, None, [], [], ''),

 # ---- 832004332 MINAS Y MINERALES ----
 ('MINAS Cucunuba->Santa Marta afiliado', '832004332', '2025-12-05', None, PCT, 0.065, 0.06, None, 1,
  [I('CUCUNUBA','SANTA MARTA')], [], ''),
 ('MINAS Cucunuba->Santa Marta no afiliado', '832004332', '2025-12-05', None, PCT, 0.027, None, None, 0,
  [I('CUCUNUBA','SANTA MARTA')], [], ''),
 ('MINAS Nemocon->Santa Marta afiliado', '832004332', '2025-10-29', None, PCT, 0.08, 0.06, None, 1,
  [I('NEMOCON','SANTA MARTA')], [], ''),
 ('MINAS Nemocon->Santa Marta no afiliado', '832004332', '2025-10-29', None, PCT, 0.027, None, None, 0,
  [I('NEMOCON','SANTA MARTA')], [], ''),
 ('MINAS Villa de San Diego->Santa Marta afiliado', '832004332', '2025-10-28', None, PCT, 0.065, 0.06, None, 1,
  [I('VILLA DE SAN DIEGO DE U','SANTA MARTA')], [], ''),
 ('MINAS Villa de San Diego->Santa Marta no afiliado', '832004332', '2025-10-28', None, PCT, 0.027, None, None, 0,
  [I('VILLA DE SAN DIEGO DE U','SANTA MARTA')], [], ''),
 ('MINAS Cucunuba->Barranquilla ene-feb 2026', '832004332', '2026-01-28', '2026-02-01', PCT, 0.027, None, None, None,
  [I('CUCUNUBA','BARRANQUILLA')], [], ''),
 ('MINAS Cucunuba->Barranquilla desde feb 2026', '832004332', '2026-02-02', None, PCT, 0.065, 0.06, None, None,
  [I('CUCUNUBA','BARRANQUILLA')], [], ''),
 ('MINAS Guacheta->Santa Marta desde mar 2026', '832004332', '2026-03-01', None, PCT, 0.065, 0.06, None, None,
  [I('GUACHETA','SANTA MARTA')], [], ''),

 # ---- 800023551 FORTIA MINERALS ----
 ('FORTIA El Zulia->Aguachica Buturama', '800023551', '2026-07-22', None, PCT, 0.027, None, None, None,
  [I('EL ZULIA','AGUACHICA BUTURAMA')], [], 'fecha corregida el 2026-09-07'),
 ('FORTIA afiliado desde nov 2025', '800023551', '2025-11-01', None, PCT, 0.065, 0.06, None, 1, [], [], ''),

 # ---- 900073066 TRANCORA ----
 ('TRANCORA afiliado desde sep 2025', '900073066', '2025-09-04', None, PCT, 0.065, 0.06, None, 1, [], [], ''),

 # ---- 900901630 Cales y Carbones ----
 ('CALES Y CARBONES afiliado desde dic 2025', '900901630', '2025-12-01', None, PCT, 0.065, 0.06, None, 1, [], [], ''),

 # ---- 800149149 ALBATEQ ----
 ('ALBATEQ origen Santa Marta feb-mar 2026', '800149149', '2026-02-01', '2026-03-07', PCT, 0.08, 0.06, None, None,
  [ORIG('SANTA MARTA')], [], ''),
 ('ALBATEQ origen Santa Marta desde mar 2026', '800149149', '2026-03-08', None, PCT, 0.027, None, None, None,
  [ORIG('SANTA MARTA')], [], ''),
]

# Las generales van de ultimas: no tienen NIT y taparian a todo lo demas.
GENERALES = [
 ('General 2,6% ene 2025', None, '2025-01-01', '2025-01-26', PCT, 0.026, None, None, None, [], [], 'regla general'),
 ('General 2,7% desde 27 ene 2025', None, '2025-01-27', None, PCT, 0.027, None, None, None, [], [], 'regla general'),
]

def lit(v):
    return 'NULL' if v is None else "'" + str(v).replace("'", "''") + "'"

def num(v):
    return 'NULL' if v is None else repr(float(v))

def bloque(prio, r):
    nombre, nit, desde, hasta, tipo, valor, pref, adi, afi, rutas, excl, obs = r
    out = []
    out.append("INSERT INTO Rebate_Regla")
    out.append("  (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,")
    out.append("   RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,")
    out.append("   ValorAdicional, Activo, Observacion, CreadoPor)")
    out.append("VALUES")
    out.append("  ('FLETE', %s, %s, %d, %s, %s," % (lit(nombre), lit(nit), prio, lit(desde), lit(hasta)))
    activo = 0 if nombre in INACTIVAS else 1
    out.append("   %s, NULL, %s, %s, %s, %s, %d, %s, 'migracion-dax');"
               % ('NULL' if afi is None else str(afi), lit(tipo), num(valor), num(pref), num(adi),
                  activo, lit(obs)))
    todas = [(x, 0) for x in rutas] + [(x, 1) for x in excl]
    if todas:
        out.append("SET @id = SCOPE_IDENTITY();")
        out.append("INSERT INTO Rebate_ReglaRuta (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir) VALUES")
        filas = ["  (@id, %s, '%s', %s, '%s', %d)" % (lit(o), oo, lit(d), dd, ex)
                 for (o, oo, d, dd), ex in todas]
        out.append(',\n'.join(filas) + ';')
    return '\n'.join(out)

lineas = []
lineas.append("""/* =====================================================================
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
""")

p = 2000
for r in REGLAS:
    lineas.append('/* ---- %d. %s ---- */' % (p, r[0]))
    lineas.append(bloque(p, r))
    lineas.append('')
    p += 10

p = 9000
for r in GENERALES:
    lineas.append('/* ---- %d. %s ---- */' % (p, r[0]))
    lineas.append(bloque(p, r))
    lineas.append('')
    p += 10

lineas.append("""GO

SELECT Prioridad, NitCliente, Nombre, TipoCalculo, Valor, ValorPoseedorPref,
       ValorAdicional, RequiereAfiliado, VigenteDesde, VigenteHasta,
       (SELECT COUNT(*) FROM Rebate_ReglaRuta t WHERE t.IdRegla = r.IdRegla AND t.Excluir = 0) AS Rutas,
       (SELECT COUNT(*) FROM Rebate_ReglaRuta t WHERE t.IdRegla = r.IdRegla AND t.Excluir = 1) AS Excluidas
FROM Rebate_Regla r WHERE Ambito = 'FLETE'
ORDER BY Prioridad;
GO""")

io.open('sql/07_reglas_flete_resto.sql', 'w', encoding='utf-8').write('\n'.join(lineas))
print('reglas generadas :', len(REGLAS) + len(GENERALES))
print('clientes         :', len(set(r[1] for r in REGLAS if r[1])))
print('rutas            :', sum(len(r[9]) for r in REGLAS))
print('rutas excluidas  :', sum(len(r[10]) for r in REGLAS))
print('inactivas        :', sum(1 for r in REGLAS if r[0] in INACTIVAS))
