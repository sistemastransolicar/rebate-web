/* =====================================================================
   Login de la aplicacion.
   - SOLO LECTURA sobre el ERP (dbsyscomTras, dbpimagT)
   - Lectura/escritura unicamente en dbRebate
   Cambia la contrasena antes de ejecutar.
   ===================================================================== */
USE master;
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'rebate_app')
    CREATE LOGIN rebate_app WITH PASSWORD = 'CAMBIAR_ESTA_CLAVE',
                                 CHECK_POLICY = ON;
GO

USE dbsyscomTras;
GO
IF USER_ID('rebate_app') IS NULL CREATE USER rebate_app FOR LOGIN rebate_app;
ALTER ROLE db_datareader ADD MEMBER rebate_app;
DENY INSERT, UPDATE, DELETE, EXECUTE TO rebate_app;
GO

USE dbpimagT;   -- Municipios
GO
IF USER_ID('rebate_app') IS NULL CREATE USER rebate_app FOR LOGIN rebate_app;
ALTER ROLE db_datareader ADD MEMBER rebate_app;
DENY INSERT, UPDATE, DELETE, EXECUTE TO rebate_app;
GO

USE dbRebate;
GO
IF USER_ID('rebate_app') IS NULL CREATE USER rebate_app FOR LOGIN rebate_app;
ALTER ROLE db_datareader ADD MEMBER rebate_app;
ALTER ROLE db_datawriter ADD MEMBER rebate_app;
GO
