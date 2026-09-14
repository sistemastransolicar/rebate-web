/* Aplica las reglas de dbRebate sobre TODOS los manifiestos de la vista
   y agrega por cliente y mes. Solo lectura. */
WITH Manif AS (
    SELECT NumManif,
           MAX(NitCliente)                    AS Nit,
           UPPER(LTRIM(RTRIM(MAX(MunicipioOrigen))))  AS Origen,
           UPPER(LTRIM(RTRIM(MAX(MunicipioDestino)))) AS Destino,
           MAX(Fecha)                         AS Fecha,
           SUM(CAST(PesoFacturaKg AS BIGINT)) AS PesoKg
    FROM vista_Rebate_Final
    GROUP BY NumManif
)
SELECT m.Nit,
       CONVERT(char(7), m.Fecha, 126)                       AS Mes,
       COUNT(*)                                             AS Manifiestos,
       SUM(CASE WHEN reg.IdRegla IS NULL THEN 0 ELSE 1 END) AS ConRegla,
       CAST(SUM(
         CASE reg.TipoCalculo
              WHEN 'FIJO'         THEN reg.Valor
              WHEN 'POR_TONELADA' THEN (m.PesoKg / 1000.0) * reg.Valor
              ELSE 0
         END) AS BIGINT)                                    AS DescuentoPlataforma
FROM Manif m
OUTER APPLY (
    SELECT TOP 1 r.IdRegla, r.TipoCalculo COLLATE DATABASE_DEFAULT AS TipoCalculo, r.Valor
    FROM dbRebate.dbo.Rebate_Regla r
    WHERE r.Ambito = 'FACTURA'
      AND r.Activo = 1
      AND (r.NitCliente   IS NULL OR r.NitCliente COLLATE DATABASE_DEFAULT = m.Nit)
      AND (r.VigenteDesde IS NULL OR m.Fecha >= r.VigenteDesde)
      AND (r.VigenteHasta IS NULL OR m.Fecha <= r.VigenteHasta)
      AND (
            NOT EXISTS (SELECT 1 FROM dbRebate.dbo.Rebate_ReglaRuta t WHERE t.IdRegla = r.IdRegla)
            OR EXISTS (
                 SELECT 1 FROM dbRebate.dbo.Rebate_ReglaRuta t
                 WHERE t.IdRegla = r.IdRegla
                   AND ( t.Origen IS NULL
                         OR (t.OrigenOperador = 'IGUAL'    AND m.Origen = t.Origen COLLATE DATABASE_DEFAULT)
                         OR (t.OrigenOperador = 'CONTIENE' AND m.Origen LIKE '%' + t.Origen COLLATE DATABASE_DEFAULT + '%') )
                   AND ( t.Destino IS NULL
                         OR (t.DestinoOperador = 'IGUAL'    AND m.Destino = t.Destino COLLATE DATABASE_DEFAULT)
                         OR (t.DestinoOperador = 'CONTIENE' AND m.Destino LIKE '%' + t.Destino COLLATE DATABASE_DEFAULT + '%') )
               )
          )
    ORDER BY r.Prioridad, r.IdRegla
) reg
GROUP BY m.Nit, CONVERT(char(7), m.Fecha, 126)
HAVING SUM(CASE WHEN reg.IdRegla IS NULL THEN 0 ELSE 1 END) > 0
ORDER BY m.Nit, Mes;
