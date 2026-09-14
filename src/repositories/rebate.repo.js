'use strict';
const { sql, syscom } = require('../config/db');
/* Ojo: aqui NO se sincroniza el listado de afiliados. La consulta lee
   la tabla Rebate_Afiliado, que mantiene al dia el temporizador de
   src/app.js. Leer el Excel de Drive dentro de una consulta congelaba
   el servidor entero cuando el archivo estaba ocupado. */

/* Nombre de agencia normalizado.

   La columna del ERP (rm.UndVol) esta cortada a diez caracteres, asi que
   media Colombia llega mutilada. El BI lo arregla en Power Query con
   estos mismos reemplazos; si aqui no se hicieran, "BARRANQUIL" y
   "BARRANQUILLA" serian dos agencias y ninguna cuadraria con su meta.

   Va arriba del todo porque el filtro de agencia tambien lo necesita, y
   en JavaScript una const no existe antes de su linea. */
const agenciaNormal = col => `
    CASE UPPER(LTRIM(RTRIM(${col})))
         WHEN 'SANTA MART' THEN 'SANTA MARTA'
         WHEN 'BARRANQUIL' THEN 'BARRANQUILLA'
         WHEN 'BUENVENTU'  THEN 'BUENAVENTURA'
         WHEN 'BUCARAMANG' THEN 'BUCARAMANGA'
         ELSE UPPER(LTRIM(RTRIM(${col}))) END`;

/* Filtros comunes al listado y al conteo. Todo parametrizado. */
const FILTROS = `
      AND (@idCia   IS NULL OR r.IdCia     = @idCia)
      AND (@nit     IS NULL OR r.IdCliente = @nit)
      /* Cliente escrito a mano: sirve el nombre (o un pedazo) y tambien el
         NIT. Se prueban los dos porque quien consulta unas veces sabe uno
         y otras el otro, y obligarlo a acertar cual es solo estorba. */
      AND (@cliente IS NULL
           OR CAST(r.IdCliente AS VARCHAR(20)) = @cliente
           OR EXISTS (SELECT 1 FROM Terceros x WITH (NOLOCK)
                      WHERE x.IdTercero = r.IdCliente
                        /* La columna es RazonSocial, NO Nombre: Terceros no tiene
                           una columna llamada Nombre. */
                        AND UPPER(x.RazonSocial) LIKE '%' + @cliente + '%'))
      /* Agencia: ahora llega de un desplegable, asi que se compara por
         igualdad y contra el nombre YA NORMALIZADO -- si se comparara
         contra la columna cruda, elegir "BARRANQUILLA" no traeria nada,
         porque en la base dice "BARRANQUIL". La segunda condicion acepta
         tambien el nombre cortado, para que un enlace viejo siga sirviendo. */
      AND (@agencia IS NULL
           OR ${agenciaNormal('rm.UndVol')} = @agencia
           OR UPPER(LTRIM(RTRIM(rm.UndVol))) = @agencia)
      AND (@manif   IS NULL OR r.NumManif  = @manif)
      AND (@origen  IS NULL OR EXISTS (
             SELECT 1 FROM dbpimagT.dbo.Municipios x WITH (NOLOCK)
             WHERE x.IdMcp = m.IdOrigen
               AND UPPER(LTRIM(RTRIM(x.Municipio))) LIKE '%' + @origen + '%'))
      AND (@destino IS NULL OR EXISTS (
             SELECT 1 FROM dbpimagT.dbo.Municipios x WITH (NOLOCK)
             WHERE x.IdMcp = m.IdDestino
               AND UPPER(LTRIM(RTRIM(x.Municipio))) LIKE '%' + @destino + '%'))
      /* Placa por coincidencia parcial, igual que cliente: la idea es que
         vaya buscando mientras se escribe. Con igualdad exacta no
         encontraba nada hasta teclear la placa completa, que es justo lo
         contrario de buscar. */
      AND (@placa   IS NULL OR UPPER(LTRIM(RTRIM(r.IdVehiculo))) LIKE '%' + @placa + '%')
      AND (@flota   IS NULL OR m.TipoAfiVehic = @flota)
      AND (@cumplido IS NULL OR (@cumplido = 'SI' AND ISNULL(m.Cumplido,0) <> 0)
                             OR (@cumplido = 'NO' AND ISNULL(m.Cumplido,0)  = 0))
      /* Afiliado segun el listado de Drive (tabla Rebate_Afiliado), que es
         la misma fuente que usa el calculo del descuento. */
      AND (@afiliado IS NULL
           OR (@afiliado = 'SI' AND EXISTS (
                 SELECT 1 FROM dbRebate.dbo.Rebate_Afiliado a WITH (NOLOCK)
                 WHERE a.Activo = 1
                   AND a.IdPoseedor COLLATE DATABASE_DEFAULT
                       = LTRIM(RTRIM(CAST(m.IdPoseedor AS VARCHAR(20))))))
           OR (@afiliado = 'NO' AND NOT EXISTS (
                 SELECT 1 FROM dbRebate.dbo.Rebate_Afiliado a WITH (NOLOCK)
                 WHERE a.Activo = 1
                   AND a.IdPoseedor COLLATE DATABASE_DEFAULT
                       = LTRIM(RTRIM(CAST(m.IdPoseedor AS VARCHAR(20)))))))
      /* ODP y facturado repiten EXACTAMENTE el TOP 1 del enriquecido. Si se
         resolvieran con un EXISTS suelto el filtro mentiria: el enriquecido
         se queda con una orden y una factura concretas, no con cualquiera. */
      AND (@odp IS NULL OR @odp = CASE WHEN ISNULL((
                 SELECT TOP 1 o.VrTotalFletes FROM Trn_TraOrdenManif o WITH (NOLOCK)
                 WHERE o.TipDoc='ODP' AND o.Manifiesto = r.NumManif
                 ORDER BY o.OrdPago DESC), 0) = 0 THEN 'NO' ELSE 'SI' END)
      AND (@facturado IS NULL OR @facturado = CASE WHEN (
                 SELECT TOP 1 f.Factura FROM Trn_TraFacRemesas f WITH (NOLOCK)
                 WHERE f.TipRem='RMT' AND f.Remesa = r.NumOrden AND f.ItemRem = rm.Item
                   AND f.TipDoc='FCR' AND f.IdCia='01' AND ISNULL(f.Anulado,0) = 0
                   AND ( (ISNULL(rm.Factura,0) NOT IN (0,1999999999) AND f.Factura = rm.Factura)
                      OR  ISNULL(rm.Factura,0) = 0 )
                 ORDER BY f.Factura DESC) IS NULL THEN 'NO' ELSE 'SI' END)`;

const DE_BASE = `
    FROM Trn_TraRemesa r WITH (NOLOCK)
    JOIN Trn_TraRemMcias rm WITH (NOLOCK)
           ON rm.TipDoc = 'RMT' AND rm.NumOrden = r.NumOrden AND rm.IdCia = r.IdCia
    JOIN Trn_TraManifiesto m WITH (NOLOCK)
           ON m.TipDoc = 'MUC' AND m.Manifiesto = r.NumManif AND m.IdCia = r.IdCia
    WHERE r.TipDoc = 'RMT'
      AND r.Fecha >= @desde
      AND r.Fecha <  DATEADD(day, 1, @hasta)` + FILTROS;

/* ---------- columnas ordenables ----------
   BASE: disponibles antes de paginar -> camino rapido
   DERIVADAS: salen de los OUTER APPLY -> hay que enriquecer antes de ordenar */
const ORD_BASE = {
  Agencia:'Agencia', IdCia:'IdCia', Fecha:'Fecha', NumManif:'NumManif',
  NumOrden:'NumOrden', Item:'Item', IdVehiculo:'IdVehiculo',
  NitCliente:'IdCliente', IdentificacionPoseedor:'IdPoseedor',
  IdentificacionConductor:'IdConductor', TarifClie:'TarifClie',
  TarifPago:'TarifPago', Cumplido:'Cumplido', TipoAfiVehic:'TipoAfiVehic',
  FechaCump:'FechaCump', CantRemesas:'CantRemesas'
};
const ORD_DERIVADAS = new Set([
  'NombreCliente','Poseedor','NombreConductor','TelMovilConductor','AFILIADO',
  'MunicipioOrigen','MunicipioDestino','PesoFinalMenor','PesoCargue','PesoDescargue','Faltante',
  'PesoFacturaKg','TarifaFactura','NumeroFactura','FechaFacturacion','ValorFactura',
  'DescuentoFactura','ValorFinal','DescuentoFlete','FleteFinal','Utilidad','UtilidadReal',
  'PctUtilPresupuesto','PctUtilidadSin27','PctUtilidadCon27',
  'BonoxRemesa',
  'CausacionPorRemesa','CargYDescxRemesa',
  'ODP','FechaOrdenPago','TarifaPagoODP','PesoODP','VrPagoFletes'
]);

const ORDEN_POR_DEFECTO = 'Fecha DESC, NumManif DESC, NumOrden, Item';

/* Coincidencia de ruta de una regla. Se usa tres veces (rutas incluidas,
   rutas excluidas) y en los dos ambitos, asi que se arma una sola vez. */
const CALZA_RUTA = `
                   AND ( t.Origen IS NULL
                         OR (t.OrigenOperador  = 'IGUAL'    AND UPPER(LTRIM(RTRIM(mo.Municipio))) =        t.Origen  COLLATE DATABASE_DEFAULT)
                         OR (t.OrigenOperador  = 'CONTIENE' AND UPPER(LTRIM(RTRIM(mo.Municipio))) LIKE '%'+t.Origen  COLLATE DATABASE_DEFAULT+'%') )
                   AND ( t.Destino IS NULL
                         OR (t.DestinoOperador = 'IGUAL'    AND UPPER(LTRIM(RTRIM(md.Municipio))) =        t.Destino COLLATE DATABASE_DEFAULT)
                         OR (t.DestinoOperador = 'CONTIENE' AND UPPER(LTRIM(RTRIM(md.Municipio))) LIKE '%'+t.Destino COLLATE DATABASE_DEFAULT+'%') )`;

/* Primera condicion que aplica, del ambito que se pida. Misma semantica que
   src/services/motorReglas.js: gana la primera por Prioridad.
   dbRebate tiene otra intercalacion, de ahi el COLLATE DATABASE_DEFAULT en
   cada comparacion de texto.
   Las rutas con Excluir = 1 se leen al reves: si coinciden, la regla NO
   aplica (asi se expresa el "en todas las rutas salvo estas"). */
const aplicaRegla = (ambito, alias) => `
OUTER APPLY (
    SELECT TOP 1 rg.IdRegla,
           rg.Nombre      COLLATE DATABASE_DEFAULT AS Nombre,
           rg.TipoCalculo COLLATE DATABASE_DEFAULT AS TipoCalculo,
           rg.Valor, rg.ValorPoseedorPref, rg.ValorAdicional
    FROM dbRebate.dbo.Rebate_Regla rg
    WHERE rg.Ambito = '${ambito}' AND rg.Activo = 1
      AND (rg.NitCliente   IS NULL OR rg.NitCliente COLLATE DATABASE_DEFAULT = b.IdCliente)
      AND (rg.VigenteDesde IS NULL OR b.Fecha >= rg.VigenteDesde)
      AND (rg.VigenteHasta IS NULL OR b.Fecha <= rg.VigenteHasta)
      AND (rg.TipoAfiVehic IS NULL OR rg.TipoAfiVehic COLLATE DATABASE_DEFAULT = b.TipoAfiVehic)
      AND (rg.RequiereAfiliado IS NULL
           OR (rg.RequiereAfiliado = 1 AND af.IdPoseedor IS NOT NULL)
           OR (rg.RequiereAfiliado = 0 AND af.IdPoseedor IS NULL))
      AND NOT EXISTS (
                 SELECT 1 FROM dbRebate.dbo.Rebate_ReglaRuta t
                 WHERE t.IdRegla = rg.IdRegla AND t.Excluir = 1${CALZA_RUTA} )
      AND ( NOT EXISTS (SELECT 1 FROM dbRebate.dbo.Rebate_ReglaRuta t
                         WHERE t.IdRegla = rg.IdRegla AND t.Excluir = 0)
            OR EXISTS (
                 SELECT 1 FROM dbRebate.dbo.Rebate_ReglaRuta t
                 WHERE t.IdRegla = rg.IdRegla AND t.Excluir = 0${CALZA_RUTA} ) )
    ORDER BY rg.Prioridad, rg.IdRegla ) ${alias}`;

/* Expresiones que se usan en mas de una columna. En SQL no se puede
   referenciar el alias de otra columna del mismo SELECT, asi que en vez de
   copiar y pegar el texto (y arriesgar que una copia se quede atras) se
   arma una sola vez aqui. */
/* ---------------------------------------------------------------------
   Cada expresion se nombra UNA vez con CROSS APPLY (VALUES ...) y despues
   se reutiliza por su alias. Escribirlas anidadas hacia que el texto de la
   consulta creciera de forma explosiva -el flete aparecia cuatro veces
   dentro del descuento, y el descuento otra vez dentro del flete final- y
   el optimizador se ahogaba: ordenar por una columna derivada pasaba de
   3 s a mas de 60 s.
   --------------------------------------------------------------------- */

/* Numerador y denominador del reparto de lo que es del manifiesto.
   Primero por tarifa x peso, que es lo que de verdad cuesta la linea; si la
   linea no trae tarifa (unas 2.500 de 2026), por peso solo; y si tampoco
   hay peso, en partes iguales.
   Se guardan separados a proposito: al repartir se multiplica ANTES de
   dividir. Calcular el factor y aplicarlo despues lo trunca, y las partes
   dejan de sumar el total (en el manifiesto 319276 se perdian 22,82 pesos
   de 7,6 millones). */
const APLICA_REPARTO = `
CROSS APPLY ( VALUES (
    CASE WHEN ISNULL(b.ImporteManif,0) > 0 THEN CAST(b.ImporteLinea AS DECIMAL(28,8))
         WHEN ISNULL(b.PesoManif,0)    > 0 THEN CAST(ISNULL(b.PesoLinea,0) AS DECIMAL(28,8))
         ELSE CAST(1 AS DECIMAL(28,8)) END,
    CASE WHEN ISNULL(b.ImporteManif,0) > 0 THEN CAST(b.ImporteManif AS DECIMAL(28,8))
         WHEN ISNULL(b.PesoManif,0)    > 0 THEN CAST(b.PesoManif   AS DECIMAL(28,8))
         ELSE CAST(NULLIF(b.CantLineasManif,0) AS DECIMAL(28,8)) END
) ) AS pr (Num, Den)`;

/** Reparte entre las lineas del manifiesto lo que es del manifiesto. */
const repartir = e => `((${e}) * pr.Num / pr.Den)`;

/* Peso, valor de factura, flete y tasa de la linea: nombrados una vez.
   El orden importa, cada uno puede usar los anteriores. */
const APLICA_LINEA = `
CROSS APPLY ( VALUES ( ISNULL(tf.Cantidad, ISNULL(cr.PesoFinal, b.PesoPlanillado)) ) ) AS pf (Peso)
CROSS APPLY ( VALUES (
    CAST(CASE WHEN ISNULL(tf.VrUnitario * tf.Cantidad, 0) = 0
              THEN ISNULL(b.TarifClie,0) * ISNULL(cr.PesoFinal, b.PesoPlanillado)
              ELSE tf.VrUnitario * tf.Cantidad END AS BIGINT) ) ) AS vf (Valor)
/* El flete lo paga el manifiesto, no la linea, asi que se reparte. La rama
   sin orden de pago es distinta: ahi no hay total del manifiesto que
   repartir, sino una estimacion tarifa x peso que ya es de la linea. */
CROSS APPLY ( VALUES (
    CASE WHEN ISNULL(om.VrTotalFletes,0) = 0
         THEN ISNULL(TRY_CONVERT(DECIMAL(18,4), b.Referencia2), b.TarifPago)
              * ISNULL(cr.PesoFinal, b.PesoPlanillado)
         ELSE ${repartir('om.VrTotalFletes')} END ) ) AS fl (Valor)
/* Si el poseedor esta en Rebate_PoseedorPreferencial y la regla trae valor
   preferencial, manda ese. No es un tope: en CARBONES ANDINOS el
   preferencial (6%) es mayor que el normal (5%). */
CROSS APPLY ( VALUES (
    CASE WHEN pp.IdPoseedor IS NOT NULL AND rl.ValorPoseedorPref IS NOT NULL
         THEN rl.ValorPoseedorPref ELSE rl.Valor END ) ) AS ta (Tasa)`;

/* Los descuentos van en DECIMAL(18,2), no en BIGINT: truncar los centavos
   linea por linea sesgaba el total hacia abajo y no cuadraba contra el BI.
   La pantalla los muestra redondeados; el dato guarda los centavos.

   Los importes fijos (el alistamiento de 445.000, el descuento de
   4.240.000, un FIJO) son POR MANIFIESTO: si no se repartieran se
   cobrarian una vez por cada linea. */
const APLICA_DESCUENTOS = `
CROSS APPLY ( VALUES (
    CASE WHEN rf.TipoCalculo = 'POR_TONELADA'
              THEN CAST( (CAST(pf.Peso AS DECIMAL(18,4)) / 1000.0) * rf.Valor AS DECIMAL(18,2))
         WHEN rf.TipoCalculo = 'PORCENTAJE'
              THEN CAST(vf.Valor * rf.Valor AS DECIMAL(18,2))
         WHEN rf.TipoCalculo = 'FIJO'
              THEN CASE WHEN b.LineaDeManifiesto = 1 THEN CAST(rf.Valor AS DECIMAL(18,2)) END
         ELSE 0 END ) ) AS dfa (Valor)
CROSS APPLY ( VALUES (
    CASE WHEN rl.TipoCalculo = 'PORCENTAJE'
              THEN CAST(fl.Valor * ta.Tasa AS DECIMAL(18,2))
         WHEN rl.TipoCalculo = 'PORCENTAJE_MAS_FIJO'
              THEN CAST(fl.Valor * ta.Tasa + ${repartir('ISNULL(rl.ValorAdicional,0)')} AS DECIMAL(18,2))
         WHEN rl.TipoCalculo = 'FLETE_MENOS_FIJO'
              THEN CAST(IIF(fl.Valor - ${repartir('ta.Tasa')} > 0,
                            fl.Valor - ${repartir('ta.Tasa')}, 0) AS DECIMAL(18,2))
         WHEN rl.TipoCalculo = 'FIJO'
              THEN CAST(${repartir('ta.Tasa')} AS DECIMAL(18,2))
         WHEN rl.TipoCalculo = 'POR_TONELADA'
              THEN CAST((CAST(pf.Peso AS DECIMAL(18,4)) / 1000.0) * ta.Tasa AS DECIMAL(18,2))
         ELSE 0 END ) ) AS dfl (Valor)
/* Tasa efectiva del descuento sobre el flete de la linea, truncada a tres
   decimales igual que el BI (ROUND(x,3,1) trunca, no redondea). Sirve para
   reconocer el descuento general del 2,6/2,7%, que es el que la utilidad
   real no cuenta como margen. Se calcula sobre los valores ya repartidos:
   como numerador y denominador llevan el mismo reparto, la tasa no cambia. */
CROSS APPLY ( VALUES (
    CASE WHEN fl.Valor > 0
         THEN ROUND(CAST(ISNULL(dfl.Valor,0) AS DECIMAL(18,6)) / fl.Valor, 3, 1)
    END ) ) AS te (Tasa)
/* Flete que queda al restar solo la parte del descuento que NO es el
   2,6/2,7% general. Es el "Flete Final" del BI -- que no es nuestro
   "Flete final": el nuestro resta todo el descuento y el del BI deja
   el 2,7% adentro. Solo se usa para el % de utilidad de presupuesto. */
CROSS APPLY ( VALUES (
    CASE WHEN te.Tasa BETWEEN 0.022 AND 0.030 THEN CAST(0 AS DECIMAL(18,2))
         ELSE ISNULL(dfl.Valor, 0) END ) ) AS d27 (Sin27)`;

/* Bono por remesa: el documento soporte del manifiesto, con los ajustes
   manuales de Rebate_AjusteManual encima, repartido igual que el flete.
   El BI lo parte en partes iguales; la suma es la misma, pero por linea
   esto refleja lo que de verdad movio cada item. */
const APLICA_BONO = `
CROSS APPLY ( VALUES (
    CAST(${repartir(`CASE WHEN aj.Tipo = 'REEMPLAZA' THEN aj.Valor
                          WHEN aj.Tipo = 'SUMA'      THEN ISNULL(dsop.ValorTotal,0) + aj.Valor
                          ELSE ISNULL(dsop.ValorTotal,0) END`)} AS DECIMAL(18,2)) ) ) AS bn (Valor)
CROSS APPLY ( VALUES (
    CAST(${repartir(`CASE WHEN ajc.Tipo = 'REEMPLAZA' THEN ajc.Valor
                          WHEN ajc.Tipo = 'SUMA'      THEN ISNULL(cau.Valor,0) + ajc.Valor
                          ELSE ISNULL(cau.Valor,0) END`)} AS DECIMAL(18,2)) ) ) AS cs (Valor)
/* El anticipo es del manifiesto y se reparte igual que el flete: asi la
   suma por lineas da el total del manifiesto una sola vez, traiga una
   remesa o traiga seis. */
CROSS APPLY ( VALUES (
    CAST(${repartir('ISNULL(ant.Valor,0)')} AS DECIMAL(18,2)) ) ) AS anp (Valor)
/* Cargue y descargue: viene de la orden de pago, o sea que es del
   manifiesto, y se reparte igual que el flete.
   El BI lo divide entre las REMESAS pero lo suma por LINEAS, asi que solo
   da bien mientras cada remesa tenga un solo item. En 2026 los 78
   manifiestos con este concepto cumplen esa condicion, pero es una
   coincidencia, no una garantia. */
CROSS APPLY ( VALUES (
    CAST(${repartir('ISNULL(om.VrConcPagos,0)')} AS DECIMAL(18,2)) ) ) AS cd (Valor)`;

/* El SELECT enriquecido. `fuente` es el CTE del que lee: Pagina (rapido) o Base (completo). */
const enriquecido = fuente => `
SELECT
    b.Agencia, b.IdCia, b.Fecha, b.NumManif, b.NumOrden, b.Item, b.IdVehiculo,
    t.IdTercero AS NitCliente, t.RazonSocial AS NombreCliente,
    b.IdPoseedor AS IdentificacionPoseedor, tp.RazonSocial AS Poseedor,
    b.IdConductor AS IdentificacionConductor,
    tc.RazonSocial AS NombreConductor, tc.TelMovil AS TelMovilConductor,
    CASE WHEN af.IdPoseedor IS NULL THEN 'NO' ELSE 'SI' END AS AFILIADO,
    b.TipoAfiVehic,
    UPPER(LTRIM(RTRIM(mo.Municipio))) AS MunicipioOrigen,
    UPPER(LTRIM(RTRIM(md.Municipio))) AS MunicipioDestino,
    b.TarifClie, b.TarifPago,
    CAST(ISNULL(cr.PesoFinal, b.PesoPlanillado) AS BIGINT) AS PesoFinalMenor,
    CAST(ISNULL(cr.PesoCargue,0) AS BIGINT) AS PesoCargue,
    CAST(ISNULL(cr.PesoNeto,0)   AS BIGINT) AS PesoDescargue,
    /* Faltante = lo que se cargo menos lo que llego. La misma resta que la
       medida Faltante del BI.

       Queda en NULL cuando falta alguno de los dos pesos, no en cero: sin
       descargue la resta daria todo el cargue y marcaria como perdido un
       viaje que apenas va en camino. En 2026 no hay ninguna linea con
       cargue y sin descargue -- o estan los dos o no esta ninguno -- asi
       que el total sigue cuadrando con el del BI.

       Puede salir NEGATIVO: son 3.742 lineas de 2026 donde el descargue
       peso mas que el cargue. Eso es un sobrante y hay que poder verlo,
       no taparlo con un cero. */
    CASE WHEN ISNULL(cr.PesoCargue,0) > 0 AND ISNULL(cr.PesoNeto,0) > 0
         THEN CAST(cr.PesoCargue - cr.PesoNeto AS BIGINT) END AS Faltante,
    CAST(pf.Peso AS BIGINT) AS PesoFacturaKg,
    CAST(ISNULL(tf.VrUnitario,0) AS DECIMAL(18,4)) AS TarifaFactura,
    CASE WHEN tf.Factura IS NULL THEN NULL ELSE CAST(tf.Factura AS VARCHAR(20)) END AS NumeroFactura,
    CONVERT(date, tf.FechaFact) AS FechaFacturacion,
    vf.Valor  AS ValorFactura,
    dfa.Valor AS DescuentoFactura,
    /* Valor final = lo facturado menos el descuento que le toca a esta linea.
       En las lineas donde el descuento es NULL (el FIJO vive en la primera
       linea del manifiesto) no se resta nada: el valor facturado de esa
       linea es real y solo el descuento esta en otro renglon. */
    CAST(vf.Valor - ISNULL(dfa.Valor, 0) AS DECIMAL(18,2)) AS ValorFinal,
    rf.Nombre      AS ReglaFactura,
    rf.TipoCalculo AS ReglaTipoCalculo,
    b.Cumplido, b.FechaCump,
    CASE WHEN ISNULL(om.VrTotalFletes,0) = 0 THEN 'NO' ELSE 'SI' END AS ODP,
    CONVERT(date, op.Fecha) AS FechaOrdenPago,
    CAST(ISNULL(om.TarifaFlete,0) AS BIGINT) AS TarifaPagoODP,
    /* Peso con el que se liquido la orden de pago. Es del MANIFIESTO, no
       de la linea: en un manifiesto con varias remesas se repite igual en
       todas, igual que la tarifa de la ODP de arriba. Sirve para contrastar
       contra el cargue, el descargue y el peso facturado -- cuando no
       coinciden, ahi esta la discusion con el poseedor. */
    CAST(ISNULL(om.PesoTotal,0) AS BIGINT) AS PesoODP,
    /* El pago del flete es del manifiesto, no del item: va en la primera
       linea de la remesa y queda NULL en las demas. NULL, no 0, para que
       no se lea como "no se pago". */
    CAST(fl.Valor AS DECIMAL(18,2)) AS VrPagoFletes,
    dfl.Valor AS DescuentoFlete,
    CAST(fl.Valor - ISNULL(dfl.Valor, 0) AS DECIMAL(18,2)) AS FleteFinal,
    /* Utilidad = lo que quedo de la factura menos lo que quedo del flete.
       Las dos puntas ya vienen con su descuento aplicado y repartidas
       entre las lineas del manifiesto, asi que la resta cuadra a nivel de
       linea y sumada tambien. */
    CAST((vf.Valor - ISNULL(dfa.Valor, 0))
       - (fl.Valor - ISNULL(dfl.Valor, 0)) AS DECIMAL(18,2)) AS Utilidad,
    /* Utilidad real: se le devuelve el descuento general del 2,6/2,7%.
       Ese descuento no es margen ganado sino la comision de siempre, asi
       que la utilidad que lo incluye esta inflada. Se reconoce por la tasa
       efectiva entre 2,2% y 3,0%, igual que el BI. */
    CAST((vf.Valor - ISNULL(dfa.Valor, 0))
       - (fl.Valor - ISNULL(dfl.Valor, 0))
       - CASE WHEN te.Tasa BETWEEN 0.022 AND 0.030
              THEN ISNULL(dfl.Valor, 0) ELSE 0 END AS DECIMAL(18,2)) AS UtilidadReal,
    te.Tasa AS TasaDescuentoFlete,
    /* Los tres porcentajes del BI. Todos sobre el valor facturado de la
       linea; en NULL cuando no hay factura, para no mostrar un 0% que
       parece un resultado y no una ausencia. */
    CASE WHEN (vf.Valor - ISNULL(dfa.Valor,0)) <> 0
         THEN CAST(((vf.Valor - ISNULL(dfa.Valor,0)) - (fl.Valor - d27.Sin27))
                   / (vf.Valor - ISNULL(dfa.Valor,0)) AS DECIMAL(9,6)) END AS PctUtilPresupuesto,
    /* Utilidad neta = utilidad menos cargue/descargue y menos el bono.
       Con 2,7% cuenta ese descuento como margen; sin 2,7% se lo devuelve. */
    CASE WHEN vf.Valor <> 0
         THEN CAST(((vf.Valor - ISNULL(dfa.Valor,0)) - (fl.Valor - ISNULL(dfl.Valor,0))
                    - ISNULL(cd.Valor,0) - ISNULL(bn.Valor,0)
                    - CASE WHEN te.Tasa BETWEEN 0.022 AND 0.030
                           THEN ISNULL(dfl.Valor,0) ELSE 0 END)
                   / vf.Valor AS DECIMAL(9,6)) END AS PctUtilidadSin27,
    CASE WHEN vf.Valor <> 0
         THEN CAST(((vf.Valor - ISNULL(dfa.Valor,0)) - (fl.Valor - ISNULL(dfl.Valor,0))
                    - ISNULL(cd.Valor,0) - ISNULL(bn.Valor,0))
                   / vf.Valor AS DECIMAL(9,6)) END AS PctUtilidadCon27,
    bn.Valor  AS BonoxRemesa,
    cs.Valor  AS CausacionPorRemesa,
    anp.Valor AS AnticipoPorRemesa,
    CAST(ISNULL(ant.Valor,0) AS BIGINT) AS AnticipoManifiesto,
    ISNULL(ant.Cantidad, 0) AS CantAnticipos,
    cd.Valor  AS CargYDescxRemesa,
    CAST(ISNULL(om.VrConcPagos,0) AS BIGINT) AS CargYDescManifiesto,
    CAST(ISNULL(dsop.ValorTotal,0) AS BIGINT) AS DocSoporte,
    CAST(ISNULL(cau.Valor,0)       AS BIGINT) AS CausacionManifiesto,
    ajc.Tipo  AS AjusteCausacionTipo,
    aj.Tipo  AS AjusteBonoTipo,
    aj.Valor AS AjusteBonoValor,
    rl.Nombre      AS ReglaFlete,
    rl.TipoCalculo AS ReglaFleteTipo,
    CASE WHEN pp.IdPoseedor IS NULL THEN 0 ELSE 1 END AS PoseedorPreferencial,
    b.CantRemesas, b.CantLineasManif,
    /* Cuantas facturas distintas cubren los items de esta remesa. El ERP
       factura por (remesa, item), asi que una misma remesa se puede partir
       en varias facturas. Solo se calcula cuando hay mas de un item; en
       remesas de un solo item queda en 0 y no se muestra nada. */
    ISNULL(fr.Facturas, 0) AS FacturasDeLaRemesa
FROM ${fuente} b
JOIN Terceros t  WITH (NOLOCK) ON t.IdTercero  = b.IdCliente
JOIN Terceros tp WITH (NOLOCK) ON tp.IdTercero = b.IdPoseedor
LEFT JOIN Terceros tc WITH (NOLOCK) ON tc.IdTercero = b.IdConductor
LEFT JOIN dbpimagT.dbo.Municipios mo WITH (NOLOCK) ON mo.IdMcp = b.IdOrigen
LEFT JOIN dbpimagT.dbo.Municipios md WITH (NOLOCK) ON md.IdMcp = b.IdDestino
/* Afiliado segun el listado que mantiene la operacion, NO segun la marca
   Fax del ERP: son dos fuentes distintas y el BI usa esta. La tabla la
   sincroniza src/services/sincronizarAfiliados.js desde la hoja de calculo.
   El COLLATE va sobre la columna de dbRebate porque la consulta corre en
   dbsyscomTras y las dos bases tienen intercalaciones distintas. */
LEFT JOIN dbRebate.dbo.Rebate_Afiliado af WITH (NOLOCK)
       ON af.Activo = 1
      AND af.IdPoseedor COLLATE DATABASE_DEFAULT = LTRIM(RTRIM(CAST(b.IdPoseedor AS VARCHAR(20))))
/* Poseedores con tarifa preferencial (EsPoseedorEspecial en el DAX). */
LEFT JOIN dbRebate.dbo.Rebate_PoseedorPreferencial pp WITH (NOLOCK)
       ON pp.Activo = 1
      AND pp.IdPoseedor COLLATE DATABASE_DEFAULT = LTRIM(RTRIM(CAST(b.IdPoseedor AS VARCHAR(20))))
/* Ajustes manuales del bono por manifiesto. */
LEFT JOIN dbRebate.dbo.Rebate_AjusteManual aj WITH (NOLOCK)
       ON aj.Activo = 1 AND aj.Ambito = 'BONO' AND aj.NumManif = b.NumManif
LEFT JOIN dbRebate.dbo.Rebate_AjusteManual ajc WITH (NOLOCK)
       ON ajc.Activo = 1 AND ajc.Ambito = 'CAUSACION' AND ajc.NumManif = b.NumManif
OUTER APPLY (
    SELECT TOP 1 x.PesoCargue, x.PesoNeto,
           CASE WHEN ISNULL(x.PesoCargue,0) > 0 AND ISNULL(x.PesoNeto,0) > 0
                     THEN IIF(x.PesoCargue < x.PesoNeto, x.PesoCargue, x.PesoNeto)
                WHEN ISNULL(x.PesoCargue,0) > 0 THEN x.PesoCargue
                WHEN ISNULL(x.PesoNeto,0)   > 0 THEN x.PesoNeto
                ELSE b.PesoPlanillado END AS PesoFinal
    FROM Trn_TraCumRemesas x WITH (NOLOCK)
    JOIN Trn_TraCumplido c WITH (NOLOCK) ON c.TipDoc='CUM' AND c.Cumplido = x.Cumplido
    WHERE x.TipDoc='CUM' AND x.TipRem='RMT'
      AND x.Remesa = b.NumOrden AND x.ItemRem = b.Item
      AND ISNULL(c.Anulado,0) = 0
    ORDER BY c.Cumplido DESC ) cr
OUTER APPLY (
    SELECT TOP 1 f.Factura, f.Cantidad, f.VrUnitario, f.FechaFact
    FROM Trn_TraFacRemesas f WITH (NOLOCK)
    WHERE f.TipRem='RMT' AND f.Remesa = b.NumOrden AND f.ItemRem = b.Item
      AND f.TipDoc='FCR' AND f.IdCia='01' AND ISNULL(f.Anulado,0) = 0
      AND ( (ISNULL(b.FacturaRM,0) NOT IN (0,1999999999) AND f.Factura = b.FacturaRM)
         OR  ISNULL(b.FacturaRM,0) = 0 )
    ORDER BY f.Factura DESC ) tf
OUTER APPLY (
    SELECT TOP 1 o.OrdPago, o.TarifaFlete, o.VrTotalFletes, o.VrConcPagos,
                 o.PesoTotal
    FROM Trn_TraOrdenManif o WITH (NOLOCK)
    WHERE o.TipDoc='ODP' AND o.Manifiesto = b.NumManif
    ORDER BY o.OrdPago DESC ) om
OUTER APPLY (
    SELECT TOP 1 p.Fecha FROM Trn_TraOrdenPago p WITH (NOLOCK)
    WHERE p.TipDoc='ODP' AND p.OrdPago = om.OrdPago AND p.IdCia = b.IdCia ) op
/* Documento soporte del manifiesto: base del bono.
   La vista usa TOP 1 sin ORDER BY y en 2026 hay 68 manifiestos con mas de
   un documento vigente (8 con valores distintos), asi que ahi devuelve
   cualquiera. Aqui se toma MAX: es determinista y es justo lo que la
   medida del BI hace despues con MAX(ValorTotalDocSoporte). */
OUTER APPLY (
    SELECT MAX(CAST(ds.ValorTotal AS DECIMAL(18,2))) AS ValorTotal
    FROM Trn_DocSoporte ds WITH (NOLOCK)
    WHERE ds.NumFactura = CAST(b.NumManif AS VARCHAR(20))
      AND ISNULL(ds.Anulado, 0) = 0 ) dsop
/* La causacion viene del CTE de arriba, ya agregada por manifiesto. */
LEFT JOIN Causacion cau ON cau.Referencia = CAST(b.NumManif AS VARCHAR(20))
/* Los anticipos tambien vienen agregados, y estos si cruzan por compania. */
LEFT JOIN Anticipo ant ON ant.Manifiesto = b.NumManif AND ant.IdCiaMuc = b.IdCia
OUTER APPLY (
    SELECT COUNT(DISTINCT f2.Factura) AS Facturas
    FROM Trn_TraFacRemesas f2 WITH (NOLOCK)
    WHERE b.CantItems > 1
      AND f2.TipDoc='FCR' AND f2.TipRem='RMT' AND f2.IdCia='01'
      AND f2.Remesa = b.NumOrden AND ISNULL(f2.Anulado,0) = 0 ) fr
${aplicaRegla('FACTURA', 'rf')}${aplicaRegla('FLETE', 'rl')}${APLICA_REPARTO}${APLICA_LINEA}${APLICA_DESCUENTOS}${APLICA_BONO}`;

const CTE_BASE = `
WITH
/* Causacion por manifiesto, agregada UNA vez.
   Estaba como subconsulta correlacionada por fila y costaba ~1,8 s por
   consulta: Trn_TraCauDetalle no tiene indice por Referencia, asi que
   cada linea la recorria entera. Son 130.000 filas, se agregan de un
   golpe y se cruzan por manifiesto.

   Se conservan dos rarezas de la vista, para dar lo mismo que el BI:
     - el DISTINCT es sobre el VALOR, no sobre el documento: dos
       causaciones del mismo manifiesto por el mismo monto cuentan una
       sola vez (2 manifiestos de 21.110 en 2026, $347.429).
     - el JOIN no filtra por compania, asi que puede tomar causaciones de
       otra IdCia con el mismo numero de manifiesto (2.991 detalles en
       2026). La version comentada de la vista si lo filtraba. */
Causacion AS (
    SELECT x.Referencia, SUM(x.VrCredito) AS Valor
    FROM ( SELECT DISTINCT d.Referencia, d.VrCredito
           FROM Trn_TraCauDetalle d WITH (NOLOCK)
           JOIN Trn_TraCausacion c WITH (NOLOCK) ON c.Causacion = d.Causacion
           WHERE d.IdConcepto IN ('DXA','DDV','DDA','DDB','DXB','DA5','DMA')
             AND ISNULL(c.Anulado, 0) = 0 ) x
    GROUP BY x.Referencia
),
/* Anticipos CARGADOS AL MANIFIESTO, agregados UNA vez.

   Suma el valor de los anticipos asignados al manifiesto, sin mirar si ya
   se abonaron o no: lo que interesa es cuanto anticipo lleva ese viaje
   encima. Por eso es VrAnticipo y no VrAbonado.

   Se agregan antes de cruzar porque un manifiesto puede tener varios
   anticipos -- 18.942 anticipos sobre 18.767 manifiestos en 2026 -- y
   cruzarlos linea por linea los multiplicaria.

   Cruza por manifiesto Y por compania: Trn_TraAnticipos si trae la
   compania del manifiesto en IdCiaMuc, asi que no hay por que arriesgarse
   a tomar el anticipo de otra cia con el mismo numero. Los anulados no
   entran: un anticipo anulado no quedo cargado a nada. */
Anticipo AS (
    SELECT a.Manifiesto, a.IdCiaMuc,
           SUM(ISNULL(a.VrAnticipo, 0)) AS Valor,
           COUNT(*)                     AS Cantidad
    FROM Trn_TraAnticipos a WITH (NOLOCK)
    WHERE a.TipDoc = 'ANT'
      AND ISNULL(a.Anulado, 0) = 0
      AND ISNULL(a.Manifiesto, 0) <> 0
    GROUP BY a.Manifiesto, a.IdCiaMuc
),
Base AS (
    SELECT r.NumOrden, r.IdCia, r.NumManif,
           CONVERT(date, r.Fecha) AS Fecha,
           r.PesoTotal AS PesoPlanillado, r.IdVehiculo, r.IdCliente,
           rm.Item, rm.UndVol AS Agencia, rm.TarifClie, rm.TarifPago, rm.Referencia2,
           rm.Factura AS FacturaRM,
           m.IdPoseedor, m.IdConductor, m.Cumplido, m.TipoAfiVehic,
           m.IdOrigen, m.IdDestino,
           CONVERT(date, m.FechaCump) AS FechaCump,
           ROW_NUMBER() OVER (PARTITION BY r.NumOrden, r.IdCia ORDER BY rm.Item) AS LineaDeRemesa,
           COUNT(*) OVER (PARTITION BY r.NumOrden, r.IdCia) AS CantItems,
           ROW_NUMBER() OVER (PARTITION BY r.NumManif, r.IdCia
                              ORDER BY r.NumOrden, rm.Item) AS LineaDeManifiesto,
           COUNT(*) OVER (PARTITION BY r.NumManif, r.IdCia) AS CantLineasManif,
           /* Lo que aporta cada linea al manifiesto: su tarifa de pago por su
              peso. Con esto se reparte lo que es del manifiesto (el flete, los
              descuentos fijos, el bono) en vez de partirlo en partes iguales.
              rm.PesoNeto es el peso del ITEM y viene en todas las lineas. */
           rm.PesoNeto AS PesoLinea,
           ISNULL(NULLIF(TRY_CONVERT(DECIMAL(18,4), rm.Referencia2), 0), rm.TarifPago)
             * ISNULL(rm.PesoNeto, 0) AS ImporteLinea,
           SUM( ISNULL(NULLIF(TRY_CONVERT(DECIMAL(18,4), rm.Referencia2), 0), rm.TarifPago)
                * ISNULL(rm.PesoNeto, 0) )
             OVER (PARTITION BY r.NumManif, r.IdCia) AS ImporteManif,
           SUM( ISNULL(rm.PesoNeto, 0) )
             OVER (PARTITION BY r.NumManif, r.IdCia) AS PesoManif,
           DENSE_RANK() OVER (PARTITION BY r.NumManif, r.IdCia ORDER BY r.NumOrden)
         + DENSE_RANK() OVER (PARTITION BY r.NumManif, r.IdCia ORDER BY r.NumOrden DESC) - 1 AS CantRemesas
    ${DE_BASE}
)`;

const CONTEO = `SELECT COUNT_BIG(*) AS Total ${DE_BASE};`;

/* La tasa efectiva del descuento no existe hasta que la consulta calcula
   la regla y el descuento, asi que no se puede resolver en Base: obliga a
   recorrer el conjunto enriquecido completo. Por eso va aparte y no se
   mezcla con los filtros de arriba. */
const FILTROS_DERIVADOS = `
    (@tasaMin IS NULL OR TasaDescuentoFlete >= @tasaMin)
AND (@tasaMax IS NULL OR TasaDescuentoFlete <= @tasaMax)`;

const hayDerivados = f =>
  !!(f.tasaMin || f.tasaMax || f.tasaMin === 0 || f.tasaMax === 0);

const RESUMEN = `
WITH Base AS (
    SELECT r.NumOrden, r.IdCia, r.NumManif, r.PesoTotal AS PesoPlanillado,
           rm.Item, rm.TarifClie, rm.TarifPago, rm.Referencia2, rm.Factura AS FacturaRM,
           m.Cumplido,
           ROW_NUMBER() OVER (PARTITION BY r.NumOrden, r.IdCia ORDER BY rm.Item) AS LineaDeRemesa,
           DENSE_RANK() OVER (PARTITION BY r.NumManif, r.IdCia ORDER BY r.NumOrden)
         + DENSE_RANK() OVER (PARTITION BY r.NumManif, r.IdCia ORDER BY r.NumOrden DESC) - 1 AS CantRemesas
    ${DE_BASE}
),
Enriquecido AS (
    SELECT b.NumManif, b.NumOrden, b.Cumplido,
           ISNULL(tf.Cantidad, ISNULL(cr.PesoFinal, b.PesoPlanillado)) AS PesoFacturaKg,
           CASE WHEN ISNULL(tf.VrUnitario*tf.Cantidad,0)=0
                THEN ISNULL(b.TarifClie,0)*ISNULL(cr.PesoFinal,b.PesoPlanillado)
                ELSE tf.VrUnitario*tf.Cantidad END AS ValorFactura,
           CASE WHEN b.LineaDeRemesa=1
                THEN CASE WHEN ISNULL(om.VrTotalFletes,0)=0
                          THEN ISNULL(TRY_CONVERT(DECIMAL(18,4),b.Referencia2), b.TarifPago)
                               * ISNULL(cr.PesoFinal, b.PesoPlanillado)
                          WHEN ISNULL(b.CantRemesas,0) > 0
                          THEN om.VrTotalFletes / b.CantRemesas
                          ELSE om.VrTotalFletes END
                ELSE 0 END AS VrPagoFletes,
           CASE WHEN ISNULL(om.VrTotalFletes,0)=0 THEN 0 ELSE 1 END AS TieneODP,
           CASE WHEN tf.Cantidad IS NULL THEN 0 ELSE 1 END          AS Facturada
    FROM Base b
    OUTER APPLY (
        SELECT TOP 1 CASE WHEN ISNULL(x.PesoCargue,0)>0 AND ISNULL(x.PesoNeto,0)>0
                               THEN IIF(x.PesoCargue<x.PesoNeto,x.PesoCargue,x.PesoNeto)
                          WHEN ISNULL(x.PesoCargue,0)>0 THEN x.PesoCargue
                          WHEN ISNULL(x.PesoNeto,0)>0   THEN x.PesoNeto
                          ELSE b.PesoPlanillado END AS PesoFinal
        FROM Trn_TraCumRemesas x WITH (NOLOCK)
        JOIN Trn_TraCumplido c WITH (NOLOCK) ON c.TipDoc='CUM' AND c.Cumplido=x.Cumplido
        WHERE x.TipDoc='CUM' AND x.TipRem='RMT'
          AND x.Remesa=b.NumOrden AND x.ItemRem=b.Item AND ISNULL(c.Anulado,0)=0
        ORDER BY c.Cumplido DESC ) cr
    OUTER APPLY (
        SELECT TOP 1 f.Cantidad, f.VrUnitario
        FROM Trn_TraFacRemesas f WITH (NOLOCK)
        WHERE f.TipRem='RMT' AND f.Remesa=b.NumOrden AND f.ItemRem=b.Item
          AND f.TipDoc='FCR' AND f.IdCia='01' AND ISNULL(f.Anulado,0)=0
          AND ( (ISNULL(b.FacturaRM,0) NOT IN (0,1999999999) AND f.Factura=b.FacturaRM)
             OR  ISNULL(b.FacturaRM,0)=0 )
        ORDER BY f.Factura DESC ) tf
    OUTER APPLY (
        SELECT TOP 1 o.VrTotalFletes
        FROM Trn_TraOrdenManif o WITH (NOLOCK)
        WHERE o.TipDoc='ODP' AND o.Manifiesto=b.NumManif
        ORDER BY o.OrdPago DESC ) om
),
/* La unidad que se factura es la linea (remesa, item), no la remesa: el ERP
   permite que los items de una misma remesa salgan en facturas distintas.
   Por eso el avance real se mide en lineas, y la remesa tiene tres estados
   (completa, parcial, sin facturar) en vez de dos. */
PorRemesa AS (
    SELECT NumOrden,
           COUNT(*)       AS LineasRem,
           SUM(Facturada) AS LineasFactRem
    FROM Enriquecido
    GROUP BY NumOrden
)
SELECT
    COUNT(DISTINCT NumManif)               AS Manifiestos,
    COUNT(DISTINCT NumOrden)               AS Remesas,
    COUNT(*)                               AS Lineas,
    SUM(Facturada)                         AS LineasFacturadas,
    CAST(SUM(PesoFacturaKg) AS BIGINT)     AS PesoFacturaKg,
    CAST(SUM(ValorFactura)  AS BIGINT)     AS ValorFactura,
    CAST(SUM(VrPagoFletes)  AS BIGINT)     AS VrPagoFletes,
    CAST(SUM(ValorFactura) - SUM(VrPagoFletes) AS BIGINT) AS UtilidadBruta,
    COUNT(DISTINCT CASE WHEN Cumplido > 0 THEN NumManif END) AS ManifCumplidos,
    COUNT(DISTINCT CASE WHEN TieneODP = 1 THEN NumManif END) AS ManifConODP,
    (SELECT COUNT(*) FROM PorRemesa WHERE LineasFactRem = LineasRem)   AS RemesasCompletas,
    (SELECT COUNT(*) FROM PorRemesa
      WHERE LineasFactRem > 0 AND LineasFactRem < LineasRem)           AS RemesasParciales,
    (SELECT COUNT(*) FROM PorRemesa WHERE LineasFactRem = 0)           AS RemesasSinFacturar
FROM Enriquecido;`;


const MIN_FECHA = process.env.FECHA_MINIMA || '2026-01-01';
const hoy = () => new Date().toISOString().slice(0, 10);

/* Los filtros de si/no aceptan solo SI o NO; cualquier otra cosa es
   "sin filtro". Asi un valor raro en la URL no cambia el resultado en
   silencio. */
const sino = v => {
  const t = (v === undefined || v === null) ? '' : String(v).trim().toUpperCase();
  return t === 'SI' || t === 'NO' ? t : null;
};

function ligar(req, f) {
  const txt = v => (v === undefined || v === null || v === '') ? null : String(v).trim().toUpperCase();
  req.input('desde',   sql.Date, f.desde || MIN_FECHA);
  req.input('hasta',   sql.Date, f.hasta || hoy());
  req.input('idCia',   sql.VarChar(2),   f.idCia   || null);
  req.input('nit',     sql.VarChar(20),  f.nit     || null);
  req.input('agencia', sql.VarChar(40),  txt(f.agencia));
  req.input('cliente', sql.VarChar(200), txt(f.cliente));
  /* Ojo: el manifiesto 0 existe (remesas huerfanas), asi que no sirve
     preguntar por f.manif a secas: 0 es falsy. */
  const manif = (f.manif === undefined || f.manif === null || f.manif === '') ? null : parseInt(f.manif, 10);
  req.input('manif',   sql.Int,          Number.isNaN(manif) ? null : manif);
  req.input('origen',  sql.VarChar(100), txt(f.origen));
  req.input('destino', sql.VarChar(100), txt(f.destino));
  req.input('placa',     sql.VarChar(10), txt(f.placa));
  req.input('flota',     sql.VarChar(20), txt(f.flota));
  req.input('cumplido',  sql.VarChar(2),  sino(f.cumplido));
  req.input('afiliado',  sql.VarChar(2),  sino(f.afiliado));
  req.input('odp',       sql.VarChar(2),  sino(f.odp));
  req.input('facturado', sql.VarChar(2),  sino(f.facturado));
  return req;
}

/* Los derivados van aparte: solo se ligan en el camino completo. */
function ligarDerivados(req, f) {
  const num = v => (v === undefined || v === null || v === '') ? null : Number(v);
  const t = v => { const n = num(v); return n === null || Number.isNaN(n) ? null : n; };
  req.input('tasaMin', sql.Decimal(9, 6), t(f.tasaMin));
  req.input('tasaMax', sql.Decimal(9, 6), t(f.tasaMax));
  return req;
}

/* Traduce ?orden=&dir= a una clausula ORDER BY segura (lista blanca). */
function resolverOrden(orden, dir) {
  const sentido = String(dir || '').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  if (!orden) return { clausula: ORDEN_POR_DEFECTO, enBase: true, orden: null, dir: null };
  /* NumOrden e Item son el desempate. Si se ordena JUSTO por una de ellas
     hay que quitarla del desempate: SQL Server rechaza una columna repetida
     en el ORDER BY. */
  const desempate = (col, pre = '') => ['NumOrden', 'Item']
      .filter(c => c !== col).map(c => pre + c).join(', ');
  if (ORD_BASE[orden]) {
    const col = ORD_BASE[orden];
    const d  = desempate(col), df = desempate(col, 'b.');
    return { clausula: `${col} ${sentido}${d ? ', ' + d : ''}`,
             clausulaFinal: `b.${col} ${sentido}${df ? ', ' + df : ''}`,
             enBase: true, orden, dir: sentido.toLowerCase() };
  }
  if (ORD_DERIVADAS.has(orden))
    // los NULL siempre al final, sin importar el sentido
    return { clausula: `CASE WHEN [${orden}] IS NULL THEN 1 ELSE 0 END, [${orden}] ${sentido}, NumOrden, Item`,
             enBase: false, orden, dir: sentido.toLowerCase() };
  return { clausula: ORDEN_POR_DEFECTO, enBase: true, orden: null, dir: null };
}

async function listar(f = {}) {
  const pool   = await syscom();
  const limite = Math.min(Math.max(parseInt(f.limite || 50, 10), 1), 500);
  const pagina = Math.max(parseInt(f.pagina || 1, 10), 1);
  const o      = resolverOrden(f.orden, f.dir);
  const der    = hayDerivados(f);
  /* Filtrar por la tasa de descuento obliga a enriquecer todo, igual que
     ordenar por una columna derivada. */
  const completo = der || !o.enBase;

  /* Camino rapido: la columna existe antes de paginar, asi que paginamos
     primero y solo enriquecemos 50 filas.
     Camino completo: hay que enriquecer todo el conjunto filtrado y
     ordenar (o filtrar) despues. Ahi el total sale con COUNT(*) OVER (),
     que se calcula antes de paginar: cuesta lo mismo que la consulta y
     ahorra recorrer el conjunto entero una segunda vez para contarlo. */
  const consulta = !completo
    ? `${CTE_BASE},
Pagina AS (
    SELECT * FROM Base
    ORDER BY ${o.clausula}
    OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
)
${enriquecido('Pagina')}
ORDER BY ${o.clausulaFinal || 'b.' + ORDEN_POR_DEFECTO.split(', ').join(', b.')};`
    : `${CTE_BASE},
Enriquecido AS (
${enriquecido('Base')}
),
Filtrado AS (
    SELECT *, COUNT(*) OVER () AS _Total
    FROM Enriquecido
    WHERE ${der ? FILTROS_DERIVADOS : '1 = 1'}
)
SELECT * FROM Filtrado
ORDER BY ${o.clausula}
OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY;`;

  const t0 = Date.now();
  const pedir = () => der ? ligarDerivados(ligar(pool.request(), f), f)
                          : ligar(pool.request(), f);
  const [filas, total] = await Promise.all([
    pedir()
      .input('offset', sql.Int, (pagina - 1) * limite)
      .input('limite', sql.Int, limite)
      .query(consulta),
    /* En el camino completo el total viene con las filas. Si la pagina
       salio vacia no hay de donde sacarlo, y ahi si toca contar aparte. */
    completo ? null : pedir().query(CONTEO)
  ]);

  let t;
  if (!completo) {
    t = Number(total.recordset[0].Total);
  } else if (filas.recordset.length) {
    t = Number(filas.recordset[0]._Total);
  } else {
    /* Pagina vacia: o no hay nada, o se pidio una pagina que ya no existe.
       Se cuenta una sola vez y sin traer columnas. */
    const c = await pedir().query(`${CTE_BASE},
Enriquecido AS (
${enriquecido('Base')}
)
SELECT COUNT_BIG(*) AS Total FROM Enriquecido
WHERE ${der ? FILTROS_DERIVADOS : '1 = 1'};`);
    t = Number(c.recordset[0].Total);
  }

  for (const fila of filas.recordset) delete fila._Total;

  return {
    filas: filas.recordset,
    total: t, pagina, limite,
    paginas: Math.ceil(t / limite),
    orden: o.orden, dir: o.dir,
    modo: completo ? 'completo' : 'rapido',
    ms: Date.now() - t0
  };
}

/* El mismo resumen, pero sobre el conjunto enriquecido.

   Hace falta porque los filtros derivados (el % de descuento) se miden
   sobre la tasa efectiva, que solo existe despues de resolver las
   condiciones: no se pueden aplicar en el camino rapido. Devuelve
   exactamente las mismas columnas que RESUMEN para que quien llama no
   tenga que saber por cual de los dos paso.

   Ojo con VrPagoFletes: aqui viene repartido entre todas las lineas del
   manifiesto y en RESUMEN va entero en la primera linea de cada remesa.
   La suma es la misma; la diferencia solo se nota linea por linea. */
const resumenDerivado = filtro => `${CTE_BASE},
Enriquecido AS (
${enriquecido('Base')}
),
Filtrado AS (
    SELECT NumManif, NumOrden, Cumplido, ODP,
           ISNULL(PesoFacturaKg,0) AS PesoFacturaKg,
           ISNULL(ValorFactura,0)  AS ValorFactura,
           ISNULL(VrPagoFletes,0)  AS VrPagoFletes,
           CASE WHEN NumeroFactura IS NULL THEN 0 ELSE 1 END AS Facturada
    FROM Enriquecido
    WHERE ${filtro}
),
PorRemesa AS (
    SELECT NumOrden,
           COUNT(*)       AS LineasRem,
           SUM(Facturada) AS LineasFactRem
    FROM Filtrado
    GROUP BY NumOrden
)
SELECT
    COUNT(DISTINCT NumManif)               AS Manifiestos,
    COUNT(DISTINCT NumOrden)               AS Remesas,
    COUNT(*)                               AS Lineas,
    SUM(Facturada)                         AS LineasFacturadas,
    CAST(SUM(PesoFacturaKg) AS BIGINT)     AS PesoFacturaKg,
    CAST(SUM(ValorFactura)  AS BIGINT)     AS ValorFactura,
    CAST(SUM(VrPagoFletes)  AS BIGINT)     AS VrPagoFletes,
    CAST(SUM(ValorFactura) - SUM(VrPagoFletes) AS BIGINT) AS UtilidadBruta,
    COUNT(DISTINCT CASE WHEN Cumplido > 0 THEN NumManif END) AS ManifCumplidos,
    COUNT(DISTINCT CASE WHEN ODP = 'SI'   THEN NumManif END) AS ManifConODP,
    (SELECT COUNT(*) FROM PorRemesa WHERE LineasFactRem = LineasRem)   AS RemesasCompletas,
    (SELECT COUNT(*) FROM PorRemesa
      WHERE LineasFactRem > 0 AND LineasFactRem < LineasRem)           AS RemesasParciales,
    (SELECT COUNT(*) FROM PorRemesa WHERE LineasFactRem = 0)           AS RemesasSinFacturar
FROM Filtrado;`;

async function resumen(f = {}) {
  const pool = await syscom();
  const t0 = Date.now();
  const der = hayDerivados(f);
  const r = der
    ? await ligarDerivados(ligar(pool.request(), f), f)
            .query(resumenDerivado(FILTROS_DERIVADOS))
    : await ligar(pool.request(), f).query(RESUMEN);
  const d = r.recordset[0] || {};
  const num = v => v === null || v === undefined ? 0 : Number(v);
  return {
    manifiestos:      num(d.Manifiestos),
    remesas:          num(d.Remesas),
    lineas:           num(d.Lineas),
    pesoFacturaKg:    num(d.PesoFacturaKg),
    valorFactura:     num(d.ValorFactura),
    vrPagoFletes:     num(d.VrPagoFletes),
    utilidadBruta:    num(d.UtilidadBruta),
    manifCumplidos:   num(d.ManifCumplidos),
    manifSinCumplir:  num(d.Manifiestos) - num(d.ManifCumplidos),
    manifConODP:      num(d.ManifConODP),
    manifSinODP:      num(d.Manifiestos) - num(d.ManifConODP),
    lineasFacturadas:   num(d.LineasFacturadas),
    lineasSinFacturar:  num(d.Lineas) - num(d.LineasFacturadas),
    remesasCompletas:   num(d.RemesasCompletas),
    remesasParciales:   num(d.RemesasParciales),
    remesasSinFacturar: num(d.RemesasSinFacturar),
    modo: der ? 'completo' : 'rapido',
    ms: Date.now() - t0
  };
}

/* Todas las filas que calzan con los filtros, sin paginar: es lo que se
   lleva a Excel. Recorre el conjunto enriquecido completo aunque no haya
   filtros derivados -- no hay forma de exportar la columna de utilidad
   sin calcularla -- asi que es una consulta pesada y se le pone tope.

   El tope no es capricho: 100.000 filas por 48 columnas ya es un archivo
   grande, y pedir el año entero sin darse cuenta es facil. Cuando se
   corta, quien llama debe avisarlo. */
const TOPE_EXPORTACION = 100000;

async function exportar(f = {}) {
  const pool = await syscom();
  const t0 = Date.now();
  const der = hayDerivados(f);
  const o   = resolverOrden(f.orden, f.dir);
  const tope = Math.min(Math.max(parseInt(f.tope || TOPE_EXPORTACION, 10), 1), TOPE_EXPORTACION);
  const consulta = `${CTE_BASE},
Enriquecido AS (
${enriquecido('Base')}
)
SELECT TOP (@tope) * FROM Enriquecido
WHERE ${der ? FILTROS_DERIVADOS : '1 = 1'}
ORDER BY ${o.clausula};`;
  const pedir = der ? ligarDerivados(ligar(pool.request(), f), f)
                    : ligar(pool.request(), f);
  const r = await pedir.input('tope', sql.Int, tope).query(consulta);
  return { filas: r.recordset, tope, cortado: r.recordset.length >= tope,
           ms: Date.now() - t0 };
}

/* Indicadores de descuentos y utilidad.

   Van aparte del resumen normal a proposito. Estos siete numeros solo
   existen despues de resolver las condiciones y repartir los valores
   entre las lineas, o sea que obligan a recorrer el conjunto enriquecido
   completo: es la parte cara de la consulta. Separandolos, la tabla y los
   indicadores de siempre siguen apareciendo rapido y estos llegan cuando
   esten, en vez de hacer esperar a todo el mundo por ellos. */
async function resumenDescuentos(f = {}) {
  const pool = await syscom();
  const t0 = Date.now();
  const der = hayDerivados(f);
  const consulta = `${CTE_BASE},
Enriquecido AS (
${enriquecido('Base')}
)
SELECT
    CAST(SUM(ISNULL(DescuentoFactura,0)) AS DECIMAL(18,2)) AS DescFactura,
    CAST(SUM(ISNULL(ValorFinal,0))       AS DECIMAL(18,2)) AS FacturaFinal,
    CAST(SUM(ISNULL(DescuentoFlete,0))   AS DECIMAL(18,2)) AS DescFlete,
    CAST(SUM(ISNULL(FleteFinal,0))       AS DECIMAL(18,2)) AS FleteFinal,
    CAST(SUM(ISNULL(Utilidad,0))         AS DECIMAL(18,2)) AS Utilidad,
    CAST(SUM(ISNULL(UtilidadReal,0))     AS DECIMAL(18,2)) AS UtilidadReal,
    /* El descuento general del 2,6/2,7%: el que la utilidad real devuelve
       porque no es margen ganado sino la comision de siempre. */
    CAST(SUM(CASE WHEN TasaDescuentoFlete BETWEEN 0.022 AND 0.030
                  THEN ISNULL(DescuentoFlete,0) ELSE 0 END) AS DECIMAL(18,2)) AS Desc27,
    /* Causaciones. La del manifiesto ya viene repartida entre sus lineas,
       asi que sumarla aqui da el total del manifiesto una sola vez, sin
       multiplicarlo por la cantidad de remesas. */
    CAST(SUM(ISNULL(CausacionPorRemesa,0)) AS DECIMAL(18,2)) AS Causacion,
    /* Se cuenta sobre el valor ya repartido, no sobre CausacionManifiesto:
       ese trae el dato crudo del ERP y se saltaria los manifiestos cuya
       causacion sale de un ajuste manual (Rebate_AjusteManual). */
    COUNT(DISTINCT CASE WHEN ISNULL(CausacionPorRemesa,0) <> 0
                        THEN NumManif END) AS ManifConCausacion,
    /* Anticipos: plata girada al poseedor ANTES de terminar el viaje. Es
       parte del flete, no un costo aparte, asi que no entra en la utilidad;
       lo que mide es cuanto del flete ya se desembolso. */
    CAST(SUM(ISNULL(AnticipoPorRemesa,0)) AS DECIMAL(18,2)) AS Anticipos,
    COUNT(DISTINCT CASE WHEN ISNULL(AnticipoManifiesto,0) <> 0
                        THEN NumManif END) AS ManifConAnticipo,
    COUNT(DISTINCT NumManif) AS Manifiestos,
    COUNT(*) AS Lineas
FROM Enriquecido
WHERE ${der ? FILTROS_DERIVADOS : '1 = 1'};`;
  const pedir = der ? ligarDerivados(ligar(pool.request(), f), f)
                    : ligar(pool.request(), f);
  const d = (await pedir.query(consulta)).recordset[0] || {};
  const num = v => v === null || v === undefined ? 0 : Number(v);
  return {
    descFactura:  num(d.DescFactura),
    facturaFinal: num(d.FacturaFinal),
    descFlete:    num(d.DescFlete),
    fleteFinal:   num(d.FleteFinal),
    utilidad:     num(d.Utilidad),
    utilidadReal: num(d.UtilidadReal),
    desc27:       num(d.Desc27),
    causacion:         num(d.Causacion),
    manifConCausacion: num(d.ManifConCausacion),
    anticipos:         num(d.Anticipos),
    manifConAnticipo:  num(d.ManifConAnticipo),
    manifiestos:       num(d.Manifiestos),
    lineas:       num(d.Lineas),
    ms: Date.now() - t0
  };
}

/* Agregado por cliente y mes. Se usa para contrastar contra el BI y como
   base de los indicadores por cliente. Recorre el conjunto enriquecido
   completo, asi que es la consulta mas pesada del repositorio. */
async function agregadoFlete(f = {}) {
  const pool = await syscom();
  const t0 = Date.now();
  const consulta = `${CTE_BASE},
Enriquecido AS (
${enriquecido('Base')}
)
SELECT NitCliente, MAX(NombreCliente) AS Cliente,
       CONVERT(char(7), Fecha, 126)              AS Mes,
       COUNT(*)                                  AS Lineas,
       CAST(SUM(ISNULL(VrPagoFletes,0))   AS BIGINT)        AS Flete,
       CAST(SUM(ISNULL(DescuentoFlete,0)) AS DECIMAL(18,2)) AS Descuento,
       CAST(SUM(ISNULL(BonoxRemesa,0))    AS DECIMAL(18,2)) AS Bono,
       CAST(SUM(ISNULL(CausacionPorRemesa,0)) AS DECIMAL(18,2)) AS Causacion,
       CAST(SUM(ISNULL(CargYDescxRemesa,0))   AS DECIMAL(18,2)) AS CargYDesc,
       CAST(SUM(ISNULL(ValorFactura,0))       AS BIGINT)        AS ValorFactura,
       CAST(SUM(ISNULL(DescuentoFactura,0))   AS DECIMAL(18,2)) AS DescFactura,
       CAST(SUM(ISNULL(Utilidad,0))           AS DECIMAL(18,2)) AS Utilidad,
       CAST(SUM(ISNULL(UtilidadReal,0))       AS DECIMAL(18,2)) AS UtilidadReal,
       COUNT(DISTINCT ReglaFlete)                AS CondicionesUsadas
FROM Enriquecido
GROUP BY NitCliente, CONVERT(char(7), Fecha, 126);`;
  const r = await ligar(pool.request(), f)
      .input('offset', sql.Int, 0).input('limite', sql.Int, 1)
      .query(consulta);
  return { filas: r.recordset, ms: Date.now() - t0 };
}

/* El mismo arreglo de nombres de arriba, aplicado a la columna que sale
   del conjunto enriquecido (ahi ya se llama Agencia). */
const AGENCIA_NORMAL = agenciaNormal('Agencia');

/* Lo real por agencia, para contrastar contra el presupuesto.

   Las tres cifras son las que mira la hoja "Presupuesto" del BI:
     toneladas  = SUM(PesoFacturaKg)/1000   (el BI: PesoFacturaToneladas)
     ventas     = SUM(ValorFinal)           (el BI: BIValorFacturaConDescuentoFinal)
     utilidad   = SUM(UtilidadReal)         (el BI: UtilPresupuesto)
   La ultima equivalencia no es evidente y conviene dejarla escrita: el BI
   define UtilPresupuesto = factura con descuento - "Flete Final", y su
   "Flete Final" resta el descuento de flete PERO NO el 2,7%. Desarrollada,
   esa resta es exactamente nuestra UtilidadReal.

   Recorre el conjunto enriquecido completo, asi que cuesta lo mismo que
   los indicadores de dinero: va por su propia ruta y llega cuando llegue. */
async function cumplimientoAgencia(f = {}) {
  const pool = await syscom();
  const t0 = Date.now();
  const der = hayDerivados(f);
  const consulta = `${CTE_BASE},
Enriquecido AS (
${enriquecido('Base')}
)
SELECT ${AGENCIA_NORMAL} AS Agencia,
       CAST(SUM(ISNULL(PesoFacturaKg,0)) AS BIGINT)        AS PesoKg,
       CAST(SUM(ISNULL(ValorFinal,0))    AS DECIMAL(18,2)) AS Ventas,
       CAST(SUM(ISNULL(UtilidadReal,0))  AS DECIMAL(18,2)) AS Utilidad,
       COUNT(DISTINCT NumManif) AS Manifiestos,
       COUNT(*)                 AS Lineas
FROM Enriquecido
WHERE ${der ? FILTROS_DERIVADOS : '1 = 1'}
GROUP BY ${AGENCIA_NORMAL}
/* Por posicion y no por alias: "ORDER BY Agencia" se resolveria contra la
   columna de origen, que no esta agrupada, y SQL Server rechaza la
   consulta. Es el mismo tropiezo que tumbo los desplegables de cliente. */
ORDER BY 3 DESC;`;
  const pedir = der ? ligarDerivados(ligar(pool.request(), f), f)
                    : ligar(pool.request(), f);
  const r = await pedir.query(consulta);
  const num = v => v === null || v === undefined ? 0 : Number(v);
  return {
    filas: r.recordset.map(x => ({
      agencia:     x.Agencia,
      toneladas:   num(x.PesoKg) / 1000,
      ventas:      num(x.Ventas),
      utilidad:    num(x.Utilidad),
      manifiestos: num(x.Manifiestos),
      lineas:      num(x.Lineas)
    })),
    ms: Date.now() - t0
  };
}

/* Viajes por cliente.

   Un viaje es un manifiesto, igual que el "Despachos" de la banda: un
   vehiculo despachado. Se cuenta con DISTINCT porque un manifiesto puede
   traer varias remesas y varias lineas.

   Dos caminos, como en el resumen: sin filtros derivados basta el conjunto
   base -- no hace falta resolver condiciones para contar viajes -- y con
   ellos toca enriquecer. El barato es el normal. */
async function viajesPorCliente(f = {}) {
  const pool = await syscom();
  const t0 = Date.now();
  const der = hayDerivados(f);
  const consulta = der
    ? `${CTE_BASE},
Enriquecido AS (
${enriquecido('Base')}
)
SELECT NitCliente AS Nit, MAX(NombreCliente) AS Cliente,
       COUNT(DISTINCT NumManif) AS Viajes,
       COUNT(DISTINCT NumOrden) AS Remesas,
       COUNT(*) AS Lineas
FROM Enriquecido
WHERE ${FILTROS_DERIVADOS}
GROUP BY NitCliente
/* Por posicion: "ORDER BY Viajes" chocaria con la columna de origen. */
ORDER BY 3 DESC;`
    : `${CTE_BASE}
SELECT t.IdTercero AS Nit, MAX(t.RazonSocial) AS Cliente,
       COUNT(DISTINCT b.NumManif) AS Viajes,
       COUNT(DISTINCT b.NumOrden) AS Remesas,
       COUNT(*) AS Lineas
FROM Base b
JOIN Terceros t WITH (NOLOCK) ON t.IdTercero = b.IdCliente
GROUP BY t.IdTercero
ORDER BY 3 DESC;`;
  const pedir = der ? ligarDerivados(ligar(pool.request(), f), f)
                    : ligar(pool.request(), f);
  const r = await pedir.query(consulta);
  const num = v => v === null || v === undefined ? 0 : Number(v);
  return {
    filas: r.recordset.map(x => ({
      nit:     x.Nit,
      cliente: (x.Cliente || '').trim() || String(x.Nit),
      viajes:  num(x.Viajes),
      remesas: num(x.Remesas),
      lineas:  num(x.Lineas)
    })),
    ms: Date.now() - t0
  };
}

/* Listado de agencias para el desplegable del filtro.

   A proposito NO depende de los filtros de la pantalla. Si la lista se
   recalculara con el rango de fechas, la agencia elegida desapareceria
   del desplegable en cuanto se moviera una fecha, y el filtro se
   limpiaria solo sin que nadie lo pidiera. Se mira siempre el mismo
   universo: PLANILLADAS DESDE EL 01-01-2025 hasta hoy.

   Tres cosas hacen que salgan agencias y no basura:

   1. Solo remesas planilladas. La columna del ERP se llama UndVol
      -- "unidad de volumen" -- y en las remesas que nunca llegaron a
      manifiesto guarda justamente eso: M3, KG y demas unidades. Exigir
      el manifiesto deja por fuera ese sobrante sin tener que adivinar
      cual valor es unidad y cual es agencia.
   2. Desde 2025: una agencia que no planilla hace mas de un año no es
      una opcion util de filtro, es ruido con nombre propio.
   3. Una malla final contra unidades de medida, por si alguna remesa
      planillada las trae igual. Es una lista corta y a la vista: si
      manaña aparece otra, se agrega aqui.

   Va con memoria de media hora porque es un recorrido largo y la
   respuesta no cambia de un minuto a otro: una agencia nueva es cosa de
   meses, no de cada consulta. */
let cacheAgencias = null;
let cacheAgenciasEn = 0;
const VIDA_CACHE_AGENCIAS = 30 * 60 * 1000;

/* Desde cuando se mira quien ha planillado. */
const DESDE_AGENCIAS = '2025-01-01';

/* Unidades de medida que el ERP guarda en la misma columna que la
   agencia. Nada de esto es una agencia de Transolicar. */
const UNIDADES = ['M3', 'MT3', 'M2', 'ML', 'MT', 'KG', 'KGS', 'KILO', 'KILOS',
                  'TON', 'TONS', 'TN', 'GL', 'GAL', 'GLS', 'LT', 'LTS',
                  'LITRO', 'LITROS', 'UN', 'UND', 'UNI', 'UNID', 'UNIDAD',
                  'CJ', 'CAJA', 'BLS', 'BULTO', 'BULTOS', 'PAQ', 'EST'];

async function listaAgencias() {
  if (cacheAgencias && Date.now() - cacheAgenciasEn < VIDA_CACHE_AGENCIAS) {
    return cacheAgencias;
  }
  const pool = await syscom();
  const t0 = Date.now();
  const consulta = `
SELECT ${agenciaNormal('rm.UndVol')} AS Agencia,
       COUNT(*)                     AS Lineas,
       MAX(r.Fecha)                 AS Ultima
FROM Trn_TraRemesa r WITH (NOLOCK)
JOIN Trn_TraRemMcias rm WITH (NOLOCK)
       ON rm.TipDoc = 'RMT' AND rm.NumOrden = r.NumOrden AND rm.IdCia = r.IdCia
/* El JOIN con el manifiesto ES el filtro: sin planilla no hay agencia. */
JOIN Trn_TraManifiesto m WITH (NOLOCK)
       ON m.TipDoc = 'MUC' AND m.Manifiesto = r.NumManif AND m.IdCia = r.IdCia
WHERE r.TipDoc = 'RMT'
  AND r.Fecha >= @desde
  AND r.Fecha <  DATEADD(day, 1, @hasta)
  AND ISNULL(r.NumManif, 0) <> 0
  AND LTRIM(RTRIM(ISNULL(rm.UndVol, ''))) <> ''
  AND UPPER(LTRIM(RTRIM(rm.UndVol))) NOT IN (${UNIDADES.map(u => `'${u}'`).join(', ')})
GROUP BY ${agenciaNormal('rm.UndVol')}
/* Por posicion: el alias Agencia se resolveria contra la columna de
   origen, que no esta agrupada, y SQL Server rechaza la consulta. */
ORDER BY 1;`;
  const r = await pool.request()
    .input('desde', sql.Date, DESDE_AGENCIAS)
    .input('hasta', sql.Date, hoy())
    .query(consulta);

  cacheAgencias = {
    desde: DESDE_AGENCIAS,
    filas: r.recordset.map(x => ({
      agencia: x.Agencia,
      lineas:  Number(x.Lineas) || 0,
      /* La ultima planilla viaja para poder decir en pantalla desde
         cuando no se mueve una agencia, sin abrir la base. */
      ultima:  x.Ultima ? String(x.Ultima).slice(0, 10) : null
    })),
    ms: Date.now() - t0
  };
  cacheAgenciasEn = Date.now();
  return cacheAgencias;
}

module.exports = { listar, resumen, resumenDescuentos, exportar, agregadoFlete,
                   cumplimientoAgencia, viajesPorCliente, listaAgencias };
