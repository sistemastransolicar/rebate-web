/* Compara la consulta nueva contra vista_Rebate_Final. Solo lectura. */

/* --- 1. Consulta nueva (tablas base) --- */
SELECT 'NUEVA' AS Origen, b.NumManif, b.NumOrden, b.Item,
       CAST(CASE
            WHEN ISNULL(cr.PesoCargue,0)>0 AND ISNULL(cr.PesoNeto,0)>0
                 THEN IIF(cr.PesoCargue<cr.PesoNeto, cr.PesoCargue, cr.PesoNeto)
            WHEN ISNULL(cr.PesoCargue,0)>0 THEN cr.PesoCargue
            WHEN ISNULL(cr.PesoNeto,0)>0   THEN cr.PesoNeto
            ELSE b.PesoTotal END AS BIGINT)                       AS PesoFinalMenor,
       CAST(ISNULL(tf.Cantidad,
            CASE
            WHEN ISNULL(cr.PesoCargue,0)>0 AND ISNULL(cr.PesoNeto,0)>0
                 THEN IIF(cr.PesoCargue<cr.PesoNeto, cr.PesoCargue, cr.PesoNeto)
            WHEN ISNULL(cr.PesoCargue,0)>0 THEN cr.PesoCargue
            WHEN ISNULL(cr.PesoNeto,0)>0   THEN cr.PesoNeto
            ELSE b.PesoTotal END) AS BIGINT)                      AS PesoFacturaKg,
       CAST(ISNULL(tf.VrUnitario,0) AS DECIMAL(18,4))             AS TarifaFactura,
       CASE WHEN tf.Factura IS NULL THEN NULL ELSE CAST(tf.Factura AS VARCHAR(20)) END AS NumeroFactura,
       CAST(CASE WHEN ISNULL(tf.VrUnitario*tf.Cantidad,0)=0
                 THEN ISNULL(b.TarifClie,0) *
                      CASE
                      WHEN ISNULL(cr.PesoCargue,0)>0 AND ISNULL(cr.PesoNeto,0)>0
                           THEN IIF(cr.PesoCargue<cr.PesoNeto, cr.PesoCargue, cr.PesoNeto)
                      WHEN ISNULL(cr.PesoCargue,0)>0 THEN cr.PesoCargue
                      WHEN ISNULL(cr.PesoNeto,0)>0   THEN cr.PesoNeto
                      ELSE b.PesoTotal END
                 ELSE tf.VrUnitario*tf.Cantidad END AS BIGINT)    AS ValorFactura
FROM (
    SELECT r.NumOrden, r.IdCia, r.NumManif, r.PesoTotal, rm.Item, rm.TarifClie,
           rm.Factura AS FacturaRM
    FROM Trn_TraRemesa r WITH (NOLOCK)
    JOIN Trn_TraRemMcias rm WITH (NOLOCK)
          ON rm.TipDoc='RMT' AND rm.NumOrden=r.NumOrden AND rm.IdCia=r.IdCia
    WHERE r.TipDoc='RMT' AND r.NumManif IN (319096,319118,319276,324543,324542)
) b
OUTER APPLY (
    SELECT TOP 1 f.Factura, f.Cantidad, f.VrUnitario
    FROM Trn_TraFacRemesas f WITH (NOLOCK)
    WHERE f.TipRem='RMT' AND f.Remesa=b.NumOrden AND f.ItemRem=b.Item
      AND f.TipDoc='FCR' AND f.IdCia='01' AND ISNULL(f.Anulado,0)=0
      AND ( (ISNULL(b.FacturaRM,0) NOT IN (0,1999999999) AND f.Factura=b.FacturaRM)
         OR  ISNULL(b.FacturaRM,0)=0 )
    ORDER BY f.Factura DESC ) tf
OUTER APPLY (
    SELECT TOP 1 x.PesoCargue, x.PesoNeto
    FROM Trn_TraCumRemesas x WITH (NOLOCK)
    JOIN Trn_TraCumplido c WITH (NOLOCK)
          ON c.TipDoc='CUM' AND c.Cumplido=x.Cumplido
    WHERE x.TipDoc='CUM' AND x.TipRem='RMT'
      AND x.Remesa=b.NumOrden AND x.ItemRem=b.Item
      AND ISNULL(c.Anulado,0)=0
    ORDER BY c.Cumplido DESC ) cr
ORDER BY b.NumManif, b.NumOrden, b.Item;

/* --- 2. La vista actual --- */
SELECT 'VISTA' AS Origen, NumManif, NumOrden, Item,
       PesoFinalMenor, PesoFacturaKg, TarifaFactura, NumeroFactura, ValorFactura
FROM vista_Rebate_Final
WHERE NumManif IN (319096,319118,319276,324543,324542)
ORDER BY NumManif, NumOrden, Item;
