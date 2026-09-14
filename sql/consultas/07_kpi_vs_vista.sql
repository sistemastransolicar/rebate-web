SELECT 'VISTA' AS Origen,
       COUNT(DISTINCT NumManif) AS Manifiestos,
       COUNT(*)                 AS Lineas,
       CAST(SUM(CAST(PesoFacturaKg AS BIGINT)) AS BIGINT) AS PesoFacturaKg,
       CAST(SUM(CAST(ValorFactura  AS BIGINT)) AS BIGINT) AS ValorFactura,
       CAST(SUM(CAST(VrPagoFletes  AS BIGINT)) AS BIGINT) AS VrPagoFletes
FROM vista_Rebate_Final
WHERE Fecha >= '2026-01-01' AND Fecha <= '2026-09-05';
