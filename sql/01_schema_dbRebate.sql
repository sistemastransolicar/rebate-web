/* =====================================================================
   dbRebate - Motor de condiciones de descuento
   Transolicar S.A.S.
   ===================================================================== */
IF DB_ID('dbRebate') IS NULL
    CREATE DATABASE dbRebate;
GO
USE dbRebate;
GO

IF OBJECT_ID('Rebate_ReglaHistorial','U') IS NOT NULL DROP TABLE Rebate_ReglaHistorial;
IF OBJECT_ID('Rebate_ReglaRuta','U')      IS NOT NULL DROP TABLE Rebate_ReglaRuta;
IF OBJECT_ID('Rebate_Regla','U')          IS NOT NULL DROP TABLE Rebate_Regla;
GO

CREATE TABLE Rebate_Regla (
    IdRegla           INT IDENTITY(1,1) PRIMARY KEY,
    Ambito            VARCHAR(10)   NOT NULL,   -- 'FACTURA' | 'FLETE'
    Nombre            VARCHAR(120)  NOT NULL,
    NitCliente        VARCHAR(20)   NULL,       -- NULL = todos los clientes
    Prioridad         INT           NOT NULL,   -- menor gana (replica el orden del SWITCH)
    VigenteDesde      DATE          NULL,
    VigenteHasta      DATE          NULL,
    RequiereAfiliado  BIT           NULL,       -- 1 = solo AFILIADO='1'
    TipoAfiVehic      VARCHAR(20)   NULL,       -- 'PROPIO' | 'TERCEROS' | NULL
    TipoCalculo       VARCHAR(20)   NOT NULL,   -- 'PORCENTAJE'|'FIJO'|'POR_TONELADA'
    Valor             DECIMAL(18,6) NOT NULL,
    Activo            BIT           NOT NULL CONSTRAINT DF_Regla_Activo DEFAULT 1,
    Observacion       VARCHAR(500)  NULL,
    CreadoPor         VARCHAR(50)   NULL,
    FechaCreacion     DATETIME      NOT NULL CONSTRAINT DF_Regla_Fecha DEFAULT GETDATE(),
    ModificadoPor     VARCHAR(50)   NULL,
    FechaModificacion DATETIME      NULL,
    CONSTRAINT CK_Regla_Ambito CHECK (Ambito IN ('FACTURA','FLETE')),
    CONSTRAINT CK_Regla_Tipo   CHECK (TipoCalculo IN ('PORCENTAJE','FIJO','POR_TONELADA')),
    CONSTRAINT CK_Regla_Fechas CHECK (VigenteHasta IS NULL OR VigenteDesde IS NULL
                                      OR VigenteHasta >= VigenteDesde)
);
GO

CREATE TABLE Rebate_ReglaRuta (
    IdRuta          INT IDENTITY(1,1) PRIMARY KEY,
    IdRegla         INT          NOT NULL,
    Origen          VARCHAR(100) NULL,   -- NULL = cualquier origen
    OrigenOperador  VARCHAR(10)  NOT NULL CONSTRAINT DF_Ruta_OpO DEFAULT 'IGUAL',
    Destino         VARCHAR(100) NULL,
    DestinoOperador VARCHAR(10)  NOT NULL CONSTRAINT DF_Ruta_OpD DEFAULT 'IGUAL',
    CONSTRAINT FK_Ruta_Regla FOREIGN KEY (IdRegla)
        REFERENCES Rebate_Regla(IdRegla) ON DELETE CASCADE,
    CONSTRAINT CK_Ruta_OpO CHECK (OrigenOperador  IN ('IGUAL','CONTIENE')),
    CONSTRAINT CK_Ruta_OpD CHECK (DestinoOperador IN ('IGUAL','CONTIENE'))
);
GO

CREATE TABLE Rebate_ReglaHistorial (
    IdHistorial INT IDENTITY(1,1) PRIMARY KEY,
    IdRegla     INT           NOT NULL,
    Accion      VARCHAR(12)   NOT NULL,   -- 'CREAR'|'EDITAR'|'DESACTIVAR'|'ACTIVAR'
    Snapshot    NVARCHAR(MAX) NOT NULL,   -- JSON del estado anterior
    Usuario     VARCHAR(50)   NULL,
    Fecha       DATETIME      NOT NULL CONSTRAINT DF_Hist_Fecha DEFAULT GETDATE()
);
GO

CREATE INDEX IX_Regla_Busqueda
    ON Rebate_Regla (Ambito, NitCliente, Activo, Prioridad)
    INCLUDE (VigenteDesde, VigenteHasta, TipoCalculo, Valor, RequiereAfiliado, TipoAfiVehic);
CREATE INDEX IX_Ruta_Regla ON Rebate_ReglaRuta (IdRegla);
CREATE INDEX IX_Hist_Regla ON Rebate_ReglaHistorial (IdRegla, Fecha DESC);
GO
