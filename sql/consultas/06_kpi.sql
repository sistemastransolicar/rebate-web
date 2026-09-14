/* KPI del informe Rebate — agregados sobre el mismo filtro del listado.
   Solo lectura. Sin paginar: recorre todo el conjunto filtrado. */

DECLARE @desde   DATE = '2026-01-01';
DECLARE @hasta   DATE = '2026-09-05';
DECLARE @idCia   VARCHAR(2)   = NULL;
DECLARE @nit     VARCHAR(20)  = NULL;
DECLARE @agencia VARCHAR(20)  = NULL;
DECLARE @origen  VARCHAR(100) = NULL;
DECLARE @destino VARCHAR(100) = NULL;
DECLARE @manif   INT          = NULL;

WITH Base AS (
    SELECT r.NumOrden, r.IdCia, r.NumManif, r.PesoTotal AS PesoPlanillado,
           rm.Item, rm.TarifClie, rm.TarifPago, rm.Referencia2, rm.Factura AS FacturaRM,
           m.Cumplido,
           ROW_NUMBER() OVER (PARTITION BY r.NumOrden, r.IdCia ORDER BY rm.Item) AS LineaDeRemesa,
           DENSE_RANK() OVER (PARTITION BY r.NumManif, r.IdCia ORDER BY r.NumOrden)
         + DENSE_RANK() OVER (PARTITION BY r.NumManif, r.IdCia ORDER BY r.NumOrden DESC) - 1 AS CantRemesas
    FROM Trn_TraRemesa r WITH (NOLOCK)
    JOIN Trn_TraRemMcias rm WITH (NOLOCK)
           ON rm.TipDoc='RMT' AND rm.NumOrden=r.NumOrden AND rm.IdCia=r.IdCia
    JOIN Trn_TraManifiesto m WITH (NOLOCK)
           ON m.TipDoc='MUC' AND m.Manifiesto=r.NumManif AND m.IdCia=r.IdCia
    WHERE r.TipDoc='RMT'
      AND r.Fecha >= @desde AND r.Fecha < DATEADD(day,1,@hasta)
      AND (@idCia   IS NULL OR r.IdCia     = @idCia)
      AND (@nit     IS NULL OR r.IdCliente = @nit)
      AND (@agencia IS NULL OR rm.UndVol   = @agencia)
      AND (@manif   IS NULL OR r.NumManif  = @manif)
      AND (@origen  IS NULL OR EXISTS (SELECT 1 FROM dbpimagT.dbo.Municipios x WITH (NOLOCK)
             WHERE x.IdMcp=m.IdOrigen AND UPPER(LTRIM(RTRIM(x.Municipio))) LIKE '%'+@origen+'%'))
      AND (@destino IS NULL OR EXISTS (SELECT 1 FROM dbpimagT.dbo.Municipios x WITH (NOLOCK)
             WHERE x.IdMcp=m.IdDestino AND UPPER(LTRIM(RTRIM(x.Municipio))) LIKE '%'+@destino+'%'))
),
Enriquecido AS (
    SELECT b.NumManif, b.NumOrden, b.Item, b.Cumplido,
           ISNULL(cr.PesoFinal, b.PesoPlanillado)                      AS PesoFinal,
           ISNULL(tf.Cantidad, ISNULL(cr.PesoFinal,b.PesoPlanillado))  AS PesoFacturaKg,
           CASE WHEN ISNULL(tf.VrUnitario*tf.Cantidad,0)=0
                THEN ISNULL(b.TarifClie,0)*ISNULL(cr.PesoFinal,b.PesoPlanillado)
                ELSE tf.VrUnitario*tf.Cantidad END                     AS ValorFactura,
           CASE WHEN b.LineaDeRemesa=1
                THEN CASE WHEN ISNULL(om.VrTotalFletes,0)=0
                          THEN ISNULL(TRY_CONVERT(DECIMAL(18,4),b.Referencia2), b.TarifPago)
                               * ISNULL(cr.PesoFinal, b.PesoPlanillado)
                          WHEN ISNULL(b.CantRemesas,0) > 0
                          THEN om.VrTotalFletes / b.CantRemesas
                          ELSE om.VrTotalFletes END
                ELSE 0 END                                             AS VrPagoFletes,
           CASE WHEN ISNULL(om.VrTotalFletes,0)=0 THEN 0 ELSE 1 END    AS TieneODP
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
)
SELECT
    COUNT(DISTINCT NumManif)                        AS Manifiestos,
    COUNT(DISTINCT NumOrden)                        AS Remesas,
    COUNT(*)                                        AS Lineas,
    CAST(SUM(PesoFacturaKg) AS BIGINT)              AS PesoFacturaKg,
    CAST(SUM(ValorFactura)  AS BIGINT)              AS ValorFactura,
    CAST(SUM(VrPagoFletes)  AS BIGINT)              AS VrPagoFletes,
    COUNT(DISTINCT CASE WHEN Cumplido > 0 THEN NumManif END) AS ManifCumplidos,
    COUNT(DISTINCT CASE WHEN TieneODP = 1 THEN NumManif END) AS ManifConODP
FROM Enriquecido;
