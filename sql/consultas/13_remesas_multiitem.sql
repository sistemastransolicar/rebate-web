/* Remesas de junio y julio 2026 con mas de un Item. Solo lectura. */
DECLARE @desde DATE = '2026-06-01';
DECLARE @hasta DATE = '2026-07-31';

WITH Base AS (
    SELECT r.NumOrden, r.IdCia, r.NumManif, CONVERT(date, r.Fecha) AS Fecha,
           r.PesoTotal AS PesoPlanillado, r.IdCliente, r.IdVehiculo,
           rm.Item, rm.Factura AS FacturaRM
    FROM Trn_TraRemesa r WITH (NOLOCK)
    JOIN Trn_TraRemMcias rm WITH (NOLOCK)
           ON rm.TipDoc='RMT' AND rm.NumOrden=r.NumOrden AND rm.IdCia=r.IdCia
    WHERE r.TipDoc='RMT' AND r.Fecha >= @desde AND r.Fecha < DATEADD(day,1,@hasta)
),
Multi AS (
    SELECT NumOrden, IdCia FROM Base
    GROUP BY NumOrden, IdCia HAVING COUNT(*) > 1
)
SELECT b.Fecha, b.NumManif, b.NumOrden, b.Item,
       t.RazonSocial                                AS Cliente,
       b.IdVehiculo,
       CAST(ISNULL(cr.PesoCargue,0) AS BIGINT)      AS Cargue,
       CAST(ISNULL(cr.PesoNeto,0)   AS BIGINT)      AS Descargue,
       CAST(ISNULL(tf.Cantidad,0)   AS BIGINT)      AS PesoFactura,
       CAST(ISNULL(tf.VrUnitario,0) AS DECIMAL(18,2)) AS Tarifa,
       tf.Factura                                   AS Factura,
       CAST(ISNULL(tf.Cantidad * tf.VrUnitario, 0) AS BIGINT) AS ValorFactura,
       COUNT(*) OVER (PARTITION BY b.NumOrden, b.IdCia)       AS ItemsDeLaRemesa
FROM Base b
JOIN Multi mu ON mu.NumOrden = b.NumOrden AND mu.IdCia = b.IdCia
JOIN Terceros t WITH (NOLOCK) ON t.IdTercero = b.IdCliente
OUTER APPLY (
    SELECT TOP 1 x.PesoCargue, x.PesoNeto
    FROM Trn_TraCumRemesas x WITH (NOLOCK)
    JOIN Trn_TraCumplido c WITH (NOLOCK) ON c.TipDoc='CUM' AND c.Cumplido=x.Cumplido
    WHERE x.TipDoc='CUM' AND x.TipRem='RMT'
      AND x.Remesa=b.NumOrden AND x.ItemRem=b.Item AND ISNULL(c.Anulado,0)=0
    ORDER BY c.Cumplido DESC ) cr
OUTER APPLY (
    SELECT TOP 1 f.Factura, f.Cantidad, f.VrUnitario
    FROM Trn_TraFacRemesas f WITH (NOLOCK)
    WHERE f.TipRem='RMT' AND f.Remesa=b.NumOrden AND f.ItemRem=b.Item
      AND f.TipDoc='FCR' AND f.IdCia='01' AND ISNULL(f.Anulado,0)=0
      AND ( (ISNULL(b.FacturaRM,0) NOT IN (0,1999999999) AND f.Factura=b.FacturaRM)
         OR  ISNULL(b.FacturaRM,0)=0 )
    ORDER BY f.Factura DESC ) tf
ORDER BY b.Fecha, b.NumManif, b.NumOrden, b.Item;
