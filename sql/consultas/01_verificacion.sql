/* Verificacion contra la base EN VIVO.
   Solo lectura. Devuelve 5 conjuntos de resultados. */

/* --- 1. Contexto: volumen y rango real de la vista --- */
SELECT 'contexto' AS Bloque,
       COUNT(*)                    AS Filas,
       COUNT(DISTINCT NumManif)    AS Manifiestos,
       MIN(Fecha)                  AS FechaMin,
       MAX(Fecha)                  AS FechaMax
FROM vista_Rebate_Final;

/* --- 2. El bug de ValorFleteConDescuento (pagina Clientes) ---
   Si la correccion ya se aplico, FilasIgualAlDescuento debe ser 0
   y PctNetoSobreFlete debe rondar 93-97. */
SELECT 'flete' AS Bloque,
       COUNT(*) AS FilasConFlete,
       SUM(CASE WHEN ABS(ValorFleteConDescuento - VrPagoFletes*0.027) <= 2
                THEN 1 ELSE 0 END)                     AS FilasIgualAlDescuento,
       SUM(CASE WHEN ValorFleteConDescuento IS NULL
                THEN 1 ELSE 0 END)                     AS FilasEnNulo,
       SUM(CAST(VrPagoFletes AS BIGINT))               AS SumaFletes,
       SUM(CAST(ValorFleteConDescuento AS BIGINT))     AS SumaNeto,
       CAST(100.0 * SUM(CAST(ValorFleteConDescuento AS BIGINT))
            / NULLIF(SUM(CAST(VrPagoFletes AS BIGINT)),0) AS DECIMAL(6,2)) AS PctNetoSobreFlete
FROM vista_Rebate_Final
WHERE VrPagoFletes > 0;

/* --- 3. Duplicacion por ItemRem: debe devolver 0 filas --- */
SELECT 'duplicados' AS Bloque, NumOrden, NumeroFactura,
       COUNT(*) AS Lineas, MIN(PesoFacturaKg) AS MinPeso, MAX(PesoFacturaKg) AS MaxPeso
FROM vista_Rebate_Final
WHERE NumeroFactura IS NOT NULL
GROUP BY NumOrden, NumeroFactura
HAVING COUNT(*) > 1 AND MIN(PesoFacturaKg) = MAX(PesoFacturaKg);

/* --- 4. Los manifiestos que veniamos revisando --- */
SELECT 'manifiestos' AS Bloque, NumManif,
       COUNT(*)                          AS Lineas,
       SUM(CAST(PesoFacturaKg AS BIGINT)) AS PesoTotal,
       SUM(CAST(ValorFactura  AS BIGINT)) AS ValorFactura,
       SUM(CAST(ValorFacturaConDescuento AS BIGINT)) AS ValorConDescuento
FROM vista_Rebate_Final
WHERE NumManif IN (319096, 319118, 319276)
GROUP BY NumManif;

/* --- 5. Contraste contra el origen: la vista vs Trn_Facturas --- */
SELECT 'contraste' AS Bloque,
       v.NumManif, v.NumeroFactura,
       SUM(CAST(v.PesoFacturaKg AS BIGINT)) AS PesoVista,
       MAX(f.PesoTotal)                     AS PesoFactura,
       SUM(CAST(v.ValorFactura AS BIGINT))  AS ValorVista,
       MAX(f.VrSubTotal)                    AS SubtotalFactura
FROM vista_Rebate_Final v
JOIN Trn_Facturas f
      ON f.TipDoc = 'FCR'
     AND f.IdCia  = '01'
     AND CAST(f.Factura AS VARCHAR(20)) = v.NumeroFactura
WHERE v.NumManif IN (319096, 319118, 319276)
GROUP BY v.NumManif, v.NumeroFactura;
