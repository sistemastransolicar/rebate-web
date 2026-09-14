/* ===================================================================
   LISTADO REBATE — contra tablas base. Solo lectura.

   Orden de operaciones (lo que hace la diferencia):
     1. Base: SOLO remesa + mercancia + manifiesto. Ahi van los filtros.
        Los municipios se filtran con EXISTS, para no unir la tabla
        cuando el filtro viene vacio.
     2. OFFSET/FETCH: se pagina aqui.
     3. Todo lo demas (terceros, municipios, factura, cumplido, ODP)
        se resuelve solo sobre las filas de la pagina.
   =================================================================== */

DECLARE @desde   DATE = '2026-01-01';
DECLARE @hasta   DATE = '2026-09-05';
DECLARE @idCia   VARCHAR(2)   = NULL;
DECLARE @nit     VARCHAR(20)  = NULL;
DECLARE @agencia VARCHAR(20)  = NULL;
DECLARE @origen  VARCHAR(100) = NULL;
DECLARE @destino VARCHAR(100) = NULL;
DECLARE @manif   INT          = NULL;
DECLARE @offset  INT = 0;
DECLARE @limite  INT = 50;

WITH Base AS (
    SELECT
        r.NumOrden, r.IdCia, r.NumManif,
        CONVERT(date, r.Fecha)  AS Fecha,
        r.PesoTotal             AS PesoPlanillado,
        r.IdVehiculo, r.IdCliente,
        rm.Item, rm.UndVol AS Agencia, rm.TarifClie, rm.TarifPago,
        rm.Factura AS FacturaRM,
        m.IdPoseedor, m.IdConductor, m.Cumplido, m.TipoAfiVehic,
        m.IdOrigen, m.IdDestino,
        CONVERT(date, m.FechaCump) AS FechaCump,
        ROW_NUMBER() OVER (PARTITION BY r.NumOrden, r.IdCia ORDER BY rm.Item) AS LineaDeRemesa
    FROM Trn_TraRemesa r WITH (NOLOCK)
    JOIN Trn_TraRemMcias rm WITH (NOLOCK)
           ON rm.TipDoc = 'RMT' AND rm.NumOrden = r.NumOrden AND rm.IdCia = r.IdCia
    JOIN Trn_TraManifiesto m WITH (NOLOCK)
           ON m.TipDoc = 'MUC' AND m.Manifiesto = r.NumManif AND m.IdCia = r.IdCia
    WHERE r.TipDoc = 'RMT'
      AND r.Fecha >= @desde
      AND r.Fecha <  DATEADD(day, 1, @hasta)
      AND (@idCia   IS NULL OR r.IdCia     = @idCia)
      AND (@nit     IS NULL OR r.IdCliente = @nit)
      AND (@agencia IS NULL OR rm.UndVol   = @agencia)
      AND (@manif   IS NULL OR r.NumManif  = @manif)
      AND (@origen  IS NULL OR EXISTS (
             SELECT 1 FROM dbpimagT.dbo.Municipios x WITH (NOLOCK)
             WHERE x.IdMcp = m.IdOrigen
               AND UPPER(LTRIM(RTRIM(x.Municipio))) LIKE '%' + @origen + '%'))
      AND (@destino IS NULL OR EXISTS (
             SELECT 1 FROM dbpimagT.dbo.Municipios x WITH (NOLOCK)
             WHERE x.IdMcp = m.IdDestino
               AND UPPER(LTRIM(RTRIM(x.Municipio))) LIKE '%' + @destino + '%'))
),
Pagina AS (
    SELECT * FROM Base
    ORDER BY Fecha DESC, NumManif DESC, NumOrden, Item
    OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
)
SELECT
    b.Agencia, b.IdCia, b.Fecha, b.NumManif, b.NumOrden, b.Item, b.IdVehiculo,
    t.IdTercero                        AS NitCliente,
    t.RazonSocial                      AS NombreCliente,
    b.IdPoseedor                       AS IdentificacionPoseedor,
    tp.RazonSocial                     AS Poseedor,
    b.IdConductor                      AS IdentificacionConductor,
    tc.RazonSocial                     AS NombreConductor,
    tc.TelMovil                        AS TelMovilConductor,
    CAST(tp.Fax AS VARCHAR(20))        AS AFILIADO,
    b.TipoAfiVehic,
    UPPER(LTRIM(RTRIM(mo.Municipio)))  AS MunicipioOrigen,
    UPPER(LTRIM(RTRIM(md.Municipio)))  AS MunicipioDestino,
    b.TarifClie, b.TarifPago,

    CAST(ISNULL(cr.PesoFinal, b.PesoPlanillado) AS BIGINT) AS PesoFinalMenor,
    CAST(ISNULL(cr.PesoCargue,0) AS BIGINT)         AS PesoCargue,
    CAST(ISNULL(cr.PesoNeto,0)   AS BIGINT)         AS PesoDescargue,

    CAST(ISNULL(tf.Cantidad, ISNULL(cr.PesoFinal, b.PesoPlanillado)) AS BIGINT) AS PesoFacturaKg,
    CAST(ISNULL(tf.VrUnitario,0) AS DECIMAL(18,4))         AS TarifaFactura,
    CASE WHEN tf.Factura IS NULL THEN NULL
         ELSE CAST(tf.Factura AS VARCHAR(20)) END          AS NumeroFactura,
    CONVERT(date, tf.FechaFact)                            AS FechaFacturacion,
    CAST(CASE WHEN ISNULL(tf.VrUnitario * tf.Cantidad, 0) = 0
              THEN ISNULL(b.TarifClie,0) * ISNULL(cr.PesoFinal, b.PesoPlanillado)
              ELSE tf.VrUnitario * tf.Cantidad END AS BIGINT) AS ValorFactura,

    b.Cumplido, b.FechaCump,
    CASE WHEN ISNULL(om.VrTotalFletes,0) = 0 THEN 'NO' ELSE 'SÍ' END AS ODP,
    CONVERT(date, op.Fecha)                        AS FechaOrdenPago,
    CAST(ISNULL(om.TarifaFlete,0) AS BIGINT)       AS TarifaPagoODP,
    CAST(CASE WHEN b.LineaDeRemesa = 1
              THEN CASE WHEN ISNULL(om.VrTotalFletes,0) = 0
                        THEN ISNULL(TRY_CONVERT(DECIMAL(18,4), b.TarifPago),0) * b.PesoPlanillado
                        WHEN ISNULL(rpm.CantRemesas,0) > 0
                        THEN om.VrTotalFletes / rpm.CantRemesas
                        ELSE om.VrTotalFletes END
              ELSE 0 END AS BIGINT)                AS VrPagoFletes,
    ISNULL(rpm.CantRemesas,0)                      AS CantRemesas,
    CASE WHEN ISNULL(rpm.CantRemesas,0) > 1 THEN 'SÍ' ELSE 'NO' END AS TieneVariasRemesas

FROM Pagina b
JOIN Terceros t  WITH (NOLOCK) ON t.IdTercero  = b.IdCliente
JOIN Terceros tp WITH (NOLOCK) ON tp.IdTercero = b.IdPoseedor
LEFT JOIN Terceros tc WITH (NOLOCK) ON tc.IdTercero = b.IdConductor
LEFT JOIN dbpimagT.dbo.Municipios mo WITH (NOLOCK) ON mo.IdMcp = b.IdOrigen
LEFT JOIN dbpimagT.dbo.Municipios md WITH (NOLOCK) ON md.IdMcp = b.IdDestino
LEFT JOIN (
        /* solo los manifiestos de esta pagina */
        SELECT rr.NumManif, rr.IdCia, COUNT(DISTINCT rr.NumOrden) AS CantRemesas
        FROM Trn_TraRemesa rr WITH (NOLOCK)
        WHERE rr.TipDoc = 'RMT'
          AND rr.NumManif IN (SELECT NumManif FROM Pagina)
        GROUP BY rr.NumManif, rr.IdCia
     ) rpm ON rpm.NumManif = b.NumManif AND rpm.IdCia = b.IdCia

/* cumplido pareado por ItemRem — usa IX_Trn_TraCumRemesas_Remesa */
OUTER APPLY (
    SELECT TOP 1 x.PesoCargue, x.PesoNeto,
           CASE
             WHEN ISNULL(x.PesoCargue,0) > 0 AND ISNULL(x.PesoNeto,0) > 0
                  THEN IIF(x.PesoCargue < x.PesoNeto, x.PesoCargue, x.PesoNeto)
             WHEN ISNULL(x.PesoCargue,0) > 0 THEN x.PesoCargue
             WHEN ISNULL(x.PesoNeto,0)   > 0 THEN x.PesoNeto
             ELSE b.PesoPlanillado
           END AS PesoFinal
    FROM Trn_TraCumRemesas x WITH (NOLOCK)
    JOIN Trn_TraCumplido c WITH (NOLOCK) ON c.TipDoc='CUM' AND c.Cumplido = x.Cumplido
    WHERE x.TipDoc='CUM' AND x.TipRem='RMT'
      AND x.Remesa = b.NumOrden AND x.ItemRem = b.Item
      AND ISNULL(c.Anulado,0) = 0
    ORDER BY c.Cumplido DESC
) cr

/* factura pareada por ItemRem — usa IX_Trn_TraFacRemesasRemesa */
OUTER APPLY (
    SELECT TOP 1 f.Factura, f.Cantidad, f.VrUnitario, f.FechaFact
    FROM Trn_TraFacRemesas f WITH (NOLOCK)
    WHERE f.TipRem='RMT' AND f.Remesa = b.NumOrden AND f.ItemRem = b.Item
      AND f.TipDoc='FCR' AND f.IdCia='01' AND ISNULL(f.Anulado,0) = 0
      AND ( (ISNULL(b.FacturaRM,0) NOT IN (0,1999999999) AND f.Factura = b.FacturaRM)
         OR  ISNULL(b.FacturaRM,0) = 0 )
    ORDER BY f.Factura DESC
) tf

/* orden de pago — usa IX_Trn_TraOrdenManif_Manifiesto_IdCia */
OUTER APPLY (
    SELECT TOP 1 o.OrdPago, o.TarifaFlete, o.VrTotalFletes
    FROM Trn_TraOrdenManif o WITH (NOLOCK)
    WHERE o.TipDoc='ODP' AND o.Manifiesto = b.NumManif
    ORDER BY o.OrdPago DESC
) om
OUTER APPLY (
    SELECT TOP 1 p.Fecha
    FROM Trn_TraOrdenPago p WITH (NOLOCK)
    WHERE p.TipDoc='ODP' AND p.OrdPago = om.OrdPago AND p.IdCia = b.IdCia
) op

ORDER BY b.Fecha DESC, b.NumManif DESC, b.NumOrden, b.Item;
