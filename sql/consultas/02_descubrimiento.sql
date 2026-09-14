/* Descubrimiento de valores y columnas. Solo lectura. */

SELECT 'TipDoc' AS Bloque, 'Trn_TraRemesa' AS Tabla, TipDoc AS Valor, COUNT(*) AS Filas
FROM Trn_TraRemesa WHERE Fecha >= '20260101' GROUP BY TipDoc
UNION ALL
SELECT 'TipDoc','Trn_TraRemMcias', TipDoc, COUNT(*) FROM Trn_TraRemMcias GROUP BY TipDoc
UNION ALL
SELECT 'TipDoc','Trn_TraManifiesto', TipDoc, COUNT(*) FROM Trn_TraManifiesto GROUP BY TipDoc
UNION ALL
SELECT 'TipDoc','Trn_TraFacRemesas', TipDoc, COUNT(*) FROM Trn_TraFacRemesas GROUP BY TipDoc
UNION ALL
SELECT 'TipRem','Trn_TraFacRemesas', TipRem, COUNT(*) FROM Trn_TraFacRemesas GROUP BY TipRem
UNION ALL
SELECT 'TipDoc','Trn_TraCumRemesas', TipDoc, COUNT(*) FROM Trn_TraCumRemesas GROUP BY TipDoc
UNION ALL
SELECT 'TipRem','Trn_TraCumRemesas', TipRem, COUNT(*) FROM Trn_TraCumRemesas GROUP BY TipRem
UNION ALL
SELECT 'TipDoc','Trn_TraCumplido', TipDoc, COUNT(*) FROM Trn_TraCumplido GROUP BY TipDoc
UNION ALL
SELECT 'TipDoc','Trn_TraOrdenManif', TipDoc, COUNT(*) FROM Trn_TraOrdenManif GROUP BY TipDoc
UNION ALL
SELECT 'TipMuc','Trn_TraOrdenManif', TipMuc, COUNT(*) FROM Trn_TraOrdenManif GROUP BY TipMuc
UNION ALL
SELECT 'TipDoc','Trn_TraOrdenPago', TipDoc, COUNT(*) FROM Trn_TraOrdenPago GROUP BY TipDoc
UNION ALL
SELECT 'IdCia','Trn_TraRemesa', IdCia, COUNT(*) FROM Trn_TraRemesa WHERE Fecha >= '20260101' GROUP BY IdCia;

/* Columnas de las tablas de detalle que necesito nombrar bien */
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH AS Largo
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('Trn_TraFacRemesas','Trn_TraCumRemesas')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
