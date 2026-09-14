/* Busca pares de reglas de FACTURA que puedan aplicar al MISMO manifiesto:
   mismo cliente (o una sin NIT), vigencias que se cruzan, y rutas compatibles.
   Si devuelve 0 filas, la prioridad no esta desempatando nada hoy. */
WITH R AS (
    SELECT IdRegla, Prioridad, Nombre, NitCliente, VigenteDesde, VigenteHasta,
           TipoCalculo, Valor,
           (SELECT COUNT(*) FROM dbRebate.dbo.Rebate_ReglaRuta t WHERE t.IdRegla = r.IdRegla) AS NRutas
    FROM dbRebate.dbo.Rebate_Regla r
    WHERE Ambito = 'FACTURA' AND Activo = 1
)
SELECT a.Prioridad AS PriA, a.Nombre AS ReglaA, a.Valor AS ValorA,
       b.Prioridad AS PriB, b.Nombre AS ReglaB, b.Valor AS ValorB,
       CONVERT(varchar(10), a.VigenteDesde,23) AS DesdeA,
       CONVERT(varchar(10), a.VigenteHasta,23) AS HastaA,
       CONVERT(varchar(10), b.VigenteDesde,23) AS DesdeB,
       CONVERT(varchar(10), b.VigenteHasta,23) AS HastaB
FROM R a
JOIN R b ON b.Prioridad > a.Prioridad
/* mismo cliente, o alguna aplica a todos */
WHERE ( a.NitCliente IS NULL OR b.NitCliente IS NULL OR a.NitCliente = b.NitCliente )
  /* las vigencias se cruzan */
  AND ( a.VigenteHasta IS NULL OR b.VigenteDesde IS NULL OR a.VigenteHasta >= b.VigenteDesde )
  AND ( b.VigenteHasta IS NULL OR a.VigenteDesde IS NULL OR b.VigenteHasta >= a.VigenteDesde )
  /* alguna no tiene rutas (aplica a todas), o comparten al menos una ruta igual */
  AND ( a.NRutas = 0 OR b.NRutas = 0
        OR EXISTS (
             SELECT 1
             FROM dbRebate.dbo.Rebate_ReglaRuta ta
             JOIN dbRebate.dbo.Rebate_ReglaRuta tb ON tb.IdRegla = b.IdRegla
             WHERE ta.IdRegla = a.IdRegla
               AND ISNULL(ta.Origen,'*')  = ISNULL(tb.Origen,'*')
               AND ISNULL(ta.Destino,'*') = ISNULL(tb.Destino,'*') ) )
ORDER BY a.Prioridad, b.Prioridad;
