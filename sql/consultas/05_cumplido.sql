/* Por que difiere PesoFinalMenor. Solo lectura. */

/* 1. Todas las lineas de cumplido de esas remesas */
SELECT 'detalle' AS Bloque, x.Remesa, x.ItemRem, x.Cumplido, x.IdCia AS IdCiaCum,
       x.PesoCargue, x.PesoNeto, c.IdCia AS IdCiaCabecera, c.Anulado, c.Fecha
FROM Trn_TraCumRemesas x WITH (NOLOCK)
JOIN Trn_TraCumplido  c WITH (NOLOCK) ON c.Cumplido = x.Cumplido
WHERE x.Remesa IN (414966, 414987, 415148)
  AND ISNULL(c.Anulado,0) = 0
ORDER BY x.Remesa, x.ItemRem, c.Cumplido DESC;

/* 2. Cuantas remesas tienen varias lineas de cumplido con pesos distintos */
SELECT 'alcance' AS Bloque,
       COUNT(*) AS RemesasConVariasLineas,
       SUM(CASE WHEN MinPeso <> MaxPeso THEN 1 ELSE 0 END) AS ConPesosDistintos
FROM (
    SELECT x.Remesa,
           COUNT(*)              AS Lineas,
           MIN(x.PesoNeto)       AS MinPeso,
           MAX(x.PesoNeto)       AS MaxPeso
    FROM Trn_TraCumRemesas x WITH (NOLOCK)
    JOIN Trn_TraCumplido  c WITH (NOLOCK) ON c.Cumplido = x.Cumplido
    JOIN Trn_TraRemesa    r WITH (NOLOCK)
          ON r.TipDoc='RMT' AND r.NumOrden = x.Remesa
    WHERE ISNULL(c.Anulado,0) = 0 AND r.Fecha >= '20260101'
    GROUP BY x.Remesa
    HAVING COUNT(*) > 1
) z;

/* 3. Cuantos cumplidos cruzan de compania (crx.IdCia <> c.IdCia) */
SELECT 'crossCia' AS Bloque,
       SUM(CASE WHEN x.IdCia <> c.IdCia THEN 1 ELSE 0 END) AS LineasCruzadas,
       COUNT(*) AS TotalLineas
FROM Trn_TraCumRemesas x WITH (NOLOCK)
JOIN Trn_TraCumplido  c WITH (NOLOCK) ON c.Cumplido = x.Cumplido
JOIN Trn_TraRemesa    r WITH (NOLOCK)
      ON r.TipDoc='RMT' AND r.NumOrden = x.Remesa
WHERE ISNULL(c.Anulado,0) = 0 AND r.Fecha >= '20260101';
