/* De donde sale PesoFacturaKg en cada fila. Solo lectura. */
DECLARE @desde DATE = '2026-09-01';
DECLARE @hasta DATE = '2026-09-06';

WITH Base AS (
    SELECT r.NumOrden, r.IdCia, r.NumManif, r.PesoTotal AS PesoPlanillado, rm.Item, rm.Factura AS FacturaRM
    FROM Trn_TraRemesa r WITH (NOLOCK)
    JOIN Trn_TraRemMcias rm WITH (NOLOCK)
           ON rm.TipDoc='RMT' AND rm.NumOrden=r.NumOrden AND rm.IdCia=r.IdCia
    JOIN Trn_TraManifiesto m WITH (NOLOCK)
           ON m.TipDoc='MUC' AND m.Manifiesto=r.NumManif AND m.IdCia=r.IdCia
    WHERE r.TipDoc='RMT' AND r.Fecha >= @desde AND r.Fecha < DATEADD(day,1,@hasta)
),
Con AS (
    SELECT b.*, cr.PesoCargue, cr.PesoNeto, cr.PesoFinal, tf.Cantidad AS CantFactura
    FROM Base b
    OUTER APPLY (
        SELECT TOP 1 x.PesoCargue, x.PesoNeto,
               CASE WHEN ISNULL(x.PesoCargue,0)>0 AND ISNULL(x.PesoNeto,0)>0
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
        SELECT TOP 1 f.Cantidad
        FROM Trn_TraFacRemesas f WITH (NOLOCK)
        WHERE f.TipRem='RMT' AND f.Remesa=b.NumOrden AND f.ItemRem=b.Item
          AND f.TipDoc='FCR' AND f.IdCia='01' AND ISNULL(f.Anulado,0)=0
          AND ( (ISNULL(b.FacturaRM,0) NOT IN (0,1999999999) AND f.Factura=b.FacturaRM)
             OR  ISNULL(b.FacturaRM,0)=0 )
        ORDER BY f.Factura DESC ) tf
)
SELECT
    CASE WHEN CantFactura IS NOT NULL THEN '1. Trn_TraFacRemesas.Cantidad  (factura)'
         WHEN PesoFinal   IS NOT NULL THEN '2. Trn_TraCumRemesas           (cumplido)'
         ELSE                              '3. Trn_TraRemesa.PesoTotal     (planillado)'
    END                                                   AS Fuente,
    COUNT(*)                                              AS Filas,
    CAST(SUM(CAST(COALESCE(CantFactura, PesoFinal, PesoPlanillado) AS BIGINT)) AS BIGINT) AS Kilos
FROM Con
GROUP BY CASE WHEN CantFactura IS NOT NULL THEN '1. Trn_TraFacRemesas.Cantidad  (factura)'
              WHEN PesoFinal   IS NOT NULL THEN '2. Trn_TraCumRemesas           (cumplido)'
              ELSE                              '3. Trn_TraRemesa.PesoTotal     (planillado)' END
ORDER BY Fuente;
