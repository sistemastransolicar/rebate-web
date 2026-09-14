/* =====================================================================
   dbRebate - Ampliación del esquema para las condiciones de FLETE
   Transolicar S.A.S.

   Las condiciones de flete del BI (medida BIDescuentoFlete) usan cuatro
   cosas que el esquema de factura no sabía expresar. Este script agrega
   las cuatro. NO borra nada: las condiciones de FACTURA ya cargadas
   quedan intactas.

   Ejecutar en SSMS conectado a dbRebate, después de 01_schema_dbRebate.sql
   ===================================================================== */
USE dbRebate;
GO

/* ---------------------------------------------------------------------
   1. Listado de poseedores AFILIADOS
   ---------------------------------------------------------------------
   El BI no usa la marca de afiliado del ERP. Usa un listado que se
   mantiene aparte (hoy un Excel en Drive) y que difiere del ERP en
   ~2.600 líneas de 2026. Para que la plataforma dé lo mismo que el BI,
   ese listado tiene que vivir aquí.
   --------------------------------------------------------------------- */
IF OBJECT_ID('Rebate_Afiliado','U') IS NULL
CREATE TABLE Rebate_Afiliado (
    IdPoseedor    VARCHAR(20)  NOT NULL PRIMARY KEY,
    Nombre        VARCHAR(200) NULL,
    Agencia       VARCHAR(60)  NULL,
    Vehiculos     INT          NULL,      -- cuántas placas trae el listado
    Activo        BIT          NOT NULL CONSTRAINT DF_Afi_Activo DEFAULT 1,
    FechaCarga    DATETIME     NOT NULL CONSTRAINT DF_Afi_Fecha  DEFAULT GETDATE(),
    CargadoPor    VARCHAR(50)  NULL,
    ArchivoOrigen VARCHAR(260) NULL
);
GO

/* Cada recarga del listado queda registrada, para saber con qué versión
   se calculó un descuento. */
IF OBJECT_ID('Rebate_AfiliadoCarga','U') IS NULL
CREATE TABLE Rebate_AfiliadoCarga (
    IdCarga       INT IDENTITY(1,1) PRIMARY KEY,
    Fecha         DATETIME     NOT NULL CONSTRAINT DF_AfiC_Fecha DEFAULT GETDATE(),
    Usuario       VARCHAR(50)  NULL,
    ArchivoOrigen VARCHAR(260) NULL,
    Poseedores    INT          NOT NULL,
    Agregados     INT          NOT NULL,
    Retirados     INT          NOT NULL
);
GO

/* ---------------------------------------------------------------------
   2. Poseedores con tarifa preferencial
   ---------------------------------------------------------------------
   En el BI aparecen 33 veces como IF(EsPoseedorEspecial, 6%, <tasa>).
   Ojo: NO es un tope. En CARBONES ANDINOS la tasa normal es 5% y estos
   poseedores reciben 6%, o sea más. Por eso el valor preferencial se
   guarda en la regla (columna ValorPoseedorPref) y esta tabla solo dice
   QUIÉNES son.
   --------------------------------------------------------------------- */
IF OBJECT_ID('Rebate_PoseedorPreferencial','U') IS NULL
CREATE TABLE Rebate_PoseedorPreferencial (
    IdPoseedor  VARCHAR(20)  NOT NULL PRIMARY KEY,
    Nombre      VARCHAR(200) NULL,
    Observacion VARCHAR(300) NULL,
    Activo      BIT          NOT NULL CONSTRAINT DF_PosPref_Activo DEFAULT 1
);
GO

IF NOT EXISTS (SELECT 1 FROM Rebate_PoseedorPreferencial WHERE IdPoseedor = '901495289')
    INSERT INTO Rebate_PoseedorPreferencial (IdPoseedor, Observacion)
    VALUES ('901495289', 'EsPoseedorEspecial en BIDescuentoFlete');
IF NOT EXISTS (SELECT 1 FROM Rebate_PoseedorPreferencial WHERE IdPoseedor = '901048549')
    INSERT INTO Rebate_PoseedorPreferencial (IdPoseedor, Observacion)
    VALUES ('901048549', 'EsPoseedorEspecial en BIDescuentoFlete');
GO

/* ---------------------------------------------------------------------
   3. Columnas nuevas en Rebate_Regla
   --------------------------------------------------------------------- */
IF COL_LENGTH('Rebate_Regla','ValorPoseedorPref') IS NULL
    ALTER TABLE Rebate_Regla ADD ValorPoseedorPref DECIMAL(18,6) NULL;
GO
IF COL_LENGTH('Rebate_Regla','ValorAdicional') IS NULL
    ALTER TABLE Rebate_Regla ADD ValorAdicional DECIMAL(18,6) NULL;
GO

/* Dos tipos de cálculo nuevos:
     PORCENTAJE_MAS_FIJO -> flete * Valor + ValorAdicional
                            (MILPA desde jul-2026: 2,7% + $445.000)
     FLETE_MENOS_FIJO    -> MAX(flete - Valor, 0)
                            (PRETENSADOS desde mar-2026: flete - $4.240.000) */
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Regla_Tipo')
    ALTER TABLE Rebate_Regla DROP CONSTRAINT CK_Regla_Tipo;
GO
ALTER TABLE Rebate_Regla ADD CONSTRAINT CK_Regla_Tipo
    CHECK (TipoCalculo IN ('PORCENTAJE','FIJO','POR_TONELADA',
                           'PORCENTAJE_MAS_FIJO','FLETE_MENOS_FIJO'));
GO

/* ---------------------------------------------------------------------
   4. Exclusión de rutas
   ---------------------------------------------------------------------
   El grupo del 7% aplica en todas las rutas SALVO CUCUTA->GAMARRA y
   BOCHALEMA->GAMARRA. Con Excluir=1 la ruta se lee al revés: si coincide,
   la regla NO aplica. Las rutas con Excluir=0 siguen funcionando igual.
   --------------------------------------------------------------------- */
IF COL_LENGTH('Rebate_ReglaRuta','Excluir') IS NULL
    ALTER TABLE Rebate_ReglaRuta ADD Excluir BIT NOT NULL
        CONSTRAINT DF_Ruta_Excluir DEFAULT 0;
GO

/* ---------------------------------------------------------------------
   5. Índices
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Afiliado_Activo')
    CREATE INDEX IX_Afiliado_Activo ON Rebate_Afiliado (Activo) INCLUDE (IdPoseedor);
GO

PRINT 'Esquema de flete listo.';
GO
