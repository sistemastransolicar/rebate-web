/* Estado del listado de afiliados despues de sincronizar.
   Solo lectura. Uso:
       node scripts\consulta-directa.js sql\consultas\20_estado_afiliados.sql */

/* 1. Ultimas cargas registradas */
SELECT TOP 8 IdCarga, Fecha, Usuario, Poseedores, Agregados, Retirados
FROM dbRebate.dbo.Rebate_AfiliadoCarga
ORDER BY IdCarga DESC;

/* 2. Cuantos quedaron activos e inactivos */
SELECT Activo, COUNT(*) AS Poseedores, MAX(FechaCarga) AS UltimoToque
FROM dbRebate.dbo.Rebate_Afiliado
GROUP BY Activo;

/* 3. El caso que veniamos siguiendo: YILCOQUE (901048549).
      Activo = 0 significa que ya salio del listado y que sus
      manifiestos deben calcular 2,7% y no 6%. */
SELECT IdPoseedor, Nombre, Agencia, Vehiculos, Activo, FechaCarga, CargadoPor
FROM dbRebate.dbo.Rebate_Afiliado
WHERE IdPoseedor = '901048549';

/* 4. Los que se desactivaron en la ultima carga */
SELECT TOP 30 IdPoseedor, Nombre, Agencia, FechaCarga
FROM dbRebate.dbo.Rebate_Afiliado
WHERE Activo = 0
  AND FechaCarga >= DATEADD(hour, -24, GETDATE())
ORDER BY FechaCarga DESC, IdPoseedor;
