/* =====================================================================
   dbRebate - Ajustes manuales por manifiesto
   Migrados desde la medida DAX "BonoxRemesa Ajustado" del modelo
   DASHBOARD_REBATE_FINAL (leida el 2026-09-08).

   En el DAX estos 16 manifiestos estan escritos a mano dentro de un
   SWITCH. Aqui pasan a ser datos: se pueden consultar, desactivar y
   auditar sin tocar codigo.

   Tipo:
     REEMPLAZA -> el bono del manifiesto es este valor, sin importar el
                  documento soporte
     SUMA      -> el bono es el documento soporte MAS este valor

   OJO con los cuatro de tipo SUMA: se escribieron cuando el documento
   soporte no existia en el ERP. Hoy ya existe y trae exactamente el
   mismo valor, asi que sumarlo lo cuenta dos veces. Quedan cargados
   como estan en el DAX para que la plataforma de lo mismo que el BI,
   pero marcados en la observacion. Para corregirlos basta
   desactivarlos (UPDATE ... SET Activo = 0) y el bono queda en el
   valor del documento soporte.

   Ejecutar DESPUES de 05_esquema_flete.sql
   ===================================================================== */
USE dbRebate;
GO

IF OBJECT_ID('Rebate_AjusteManual','U') IS NULL
CREATE TABLE Rebate_AjusteManual (
    IdAjuste      INT IDENTITY(1,1) PRIMARY KEY,
    Ambito        VARCHAR(10)   NOT NULL,          -- 'BONO'
    NumManif      INT           NOT NULL,
    Tipo          VARCHAR(12)   NOT NULL,          -- 'REEMPLAZA' | 'SUMA'
    Valor         DECIMAL(18,2) NOT NULL,
    Activo        BIT           NOT NULL CONSTRAINT DF_Aju_Activo DEFAULT 1,
    Observacion   VARCHAR(300)  NULL,
    CreadoPor     VARCHAR(50)   NULL,
    FechaCreacion DATETIME      NOT NULL CONSTRAINT DF_Aju_Fecha DEFAULT GETDATE(),
    CONSTRAINT CK_Aju_Ambito CHECK (Ambito IN ('BONO')),
    CONSTRAINT CK_Aju_Tipo   CHECK (Tipo   IN ('REEMPLAZA','SUMA'))
);
GO

/* Un solo ajuste vigente por manifiesto y ambito */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Aju_Manif')
    CREATE UNIQUE INDEX UX_Aju_Manif ON Rebate_AjusteManual (Ambito, NumManif)
    WHERE Activo = 1;
GO

/* Re-ejecutable */
DELETE FROM Rebate_AjusteManual WHERE CreadoPor = 'migracion-dax';
GO

/* ---- 4 manifiestos con bono fijo de 130.000 (2025) ---- */
INSERT INTO Rebate_AjusteManual (Ambito, NumManif, Tipo, Valor, Observacion, CreadoPor)
VALUES ('BONO', 291168, 'REEMPLAZA', 130000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax'),
       ('BONO', 291052, 'REEMPLAZA', 130000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax'),
       ('BONO', 291197, 'REEMPLAZA', 130000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax'),
       ('BONO', 291117, 'REEMPLAZA', 130000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax');

/* ---- 8 manifiestos con bono fijo de 100.000 (2025) ---- */
INSERT INTO Rebate_AjusteManual (Ambito, NumManif, Tipo, Valor, Observacion, CreadoPor)
VALUES ('BONO', 291374, 'REEMPLAZA', 100000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax'),
       ('BONO', 291422, 'REEMPLAZA', 100000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax'),
       ('BONO', 291483, 'REEMPLAZA', 100000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax'),
       ('BONO', 291546, 'REEMPLAZA', 100000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax'),
       ('BONO', 291572, 'REEMPLAZA', 100000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax'),
       ('BONO', 291301, 'REEMPLAZA', 100000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax'),
       ('BONO', 291444, 'REEMPLAZA', 100000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax'),
       ('BONO', 291482, 'REEMPLAZA', 100000, 'SWITCH BonoxRemesa Ajustado', 'migracion-dax');

/* ---- 4 manifiestos de 2026 que SUMAN sobre el documento soporte ----
   Revisados el 2026-09-08: el documento soporte ya existe en el ERP con
   exactamente el mismo valor del ajuste, asi que hoy el bono sale al
   doble. Se cargan igual que el DAX; desactivarlos lo corrige. */
INSERT INTO Rebate_AjusteManual (Ambito, NumManif, Tipo, Valor, Observacion, CreadoPor)
VALUES ('BONO', 317765, 'SUMA',  50000, 'REVISAR: el doc soporte ya vale 50.000, se cuenta doble',  'migracion-dax'),
       ('BONO', 317111, 'SUMA', 365000, 'REVISAR: el doc soporte ya vale 365.000, se cuenta doble', 'migracion-dax'),
       ('BONO', 317852, 'SUMA', 467000, 'REVISAR: el doc soporte ya vale 467.000, se cuenta doble', 'migracion-dax'),
       ('BONO', 318557, 'SUMA', 170000, 'REVISAR: el doc soporte ya vale 170.000, se cuenta doble', 'migracion-dax');
GO

SELECT NumManif, Tipo, Valor, Activo, Observacion
FROM Rebate_AjusteManual WHERE Ambito = 'BONO' ORDER BY Tipo, NumManif;
GO
