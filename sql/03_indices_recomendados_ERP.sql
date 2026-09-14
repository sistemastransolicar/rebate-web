/* =====================================================================
   INDICES RECOMENDADOS SOBRE EL ERP (dbsyscomTras)

   ATENCION: esto MODIFICA la base de produccion de Syscom.
   - Un indice no cambia datos, pero si ocupa espacio y agrega costo a
     cada INSERT/UPDATE de esas tablas.
   - Si Syscom es software de proveedor, verifica que no viole el soporte.
   - Ejecutar en ventana de baja actividad. ONLINE=ON requiere Enterprise;
     en Standard 2014 el CREATE INDEX bloquea la tabla mientras corre.

   Sin estos indices el informe funciona igual, pero las tres consultas
   que dependen de ellos hacen recorrido completo de tabla.
   ===================================================================== */
USE dbsyscomTras;
GO

/* 1. Causacion por manifiesto.
   La vista busca:  d.Referencia = CAST(r.NumManif AS VARCHAR)
   Hoy NO hay indice por Referencia -> recorrido completo por cada manifiesto.
   Es el costo mas alto de la vista. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_Trn_TraCauDetalle_Referencia'
                 AND object_id = OBJECT_ID('Trn_TraCauDetalle'))
CREATE NONCLUSTERED INDEX IX_Trn_TraCauDetalle_Referencia
    ON Trn_TraCauDetalle (Referencia)
    INCLUDE (IdConcepto, VrCredito, Causacion, TipDoc, IdCia);
GO

/* 2. Documento soporte por manifiesto.
   La vista busca:  ds.NumFactura = CAST(r.NumManif AS VARCHAR)
   Solo hay indices por Fecha e IdTercero -> recorrido completo. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_Trn_DocSoporte_NumFactura'
                 AND object_id = OBJECT_ID('Trn_DocSoporte'))
CREATE NONCLUSTERED INDEX IX_Trn_DocSoporte_NumFactura
    ON Trn_DocSoporte (NumFactura)
    INCLUDE (ValorTotal, Anulado);
GO

/* 3. Remesa por manifiesto.
   Trn_TraRemesa no tiene indice por NumManif. Buscar "manifiesto 319276"
   recorre toda la tabla. Necesario para el buscador del informe. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_Trn_TraRemesa_NumManif'
                 AND object_id = OBJECT_ID('Trn_TraRemesa'))
CREATE NONCLUSTERED INDEX IX_Trn_TraRemesa_NumManif
    ON Trn_TraRemesa (NumManif, IdCia)
    INCLUDE (NumOrden, TipDoc, Fecha, IdCliente);
GO

/* Para revertir:
DROP INDEX IX_Trn_TraCauDetalle_Referencia ON Trn_TraCauDetalle;
DROP INDEX IX_Trn_DocSoporte_NumFactura    ON Trn_DocSoporte;
DROP INDEX IX_Trn_TraRemesa_NumManif       ON Trn_TraRemesa;
*/
