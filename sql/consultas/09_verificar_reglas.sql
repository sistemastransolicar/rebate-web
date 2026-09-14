SELECT 'tablas' AS Bloque,
       (SELECT COUNT(*) FROM dbRebate.INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE') AS Tablas,
       (SELECT COUNT(*) FROM dbRebate.dbo.Rebate_Regla)          AS Reglas,
       (SELECT COUNT(*) FROM dbRebate.dbo.Rebate_ReglaRuta)      AS Rutas,
       (SELECT COUNT(*) FROM dbRebate.dbo.Rebate_ReglaHistorial) AS Historial;

SELECT r.Prioridad, r.Ambito, r.Nombre, r.NitCliente,
       CONVERT(varchar(10), r.VigenteDesde, 23) AS Desde,
       CONVERT(varchar(10), r.VigenteHasta, 23) AS Hasta,
       r.TipoCalculo, r.Valor, r.Activo,
       (SELECT COUNT(*) FROM dbRebate.dbo.Rebate_ReglaRuta x WHERE x.IdRegla = r.IdRegla) AS Rutas
FROM dbRebate.dbo.Rebate_Regla r
ORDER BY r.Ambito, r.Prioridad;
