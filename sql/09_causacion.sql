/* =====================================================================
   dbRebate - Ajustes manuales de CAUSACION
   Migrados desde la medida DAX "CausacionPorRemesa" del modelo
   DASHBOARD_REBATE_FINAL (leida el 2026-09-08).

   A diferencia de los del BONO, estos cuatro NO duplican nada: los
   manifiestos no tienen causacion calculada en el ERP (sale NULL), asi
   que el valor del DAX es el unico dato que hay. Por eso son REEMPLAZA
   y quedan activos sin reparos.

   Ejecutar DESPUES de 08_ajustes_manuales.sql
   ===================================================================== */
USE dbRebate;
GO

/* La tabla nacio aceptando solo 'BONO'; ahora tambien 'CAUSACION'. */
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Aju_Ambito')
    ALTER TABLE Rebate_AjusteManual DROP CONSTRAINT CK_Aju_Ambito;
GO
ALTER TABLE Rebate_AjusteManual ADD CONSTRAINT CK_Aju_Ambito
    CHECK (Ambito IN ('BONO','CAUSACION'));
GO

DELETE FROM Rebate_AjusteManual
 WHERE Ambito = 'CAUSACION' AND CreadoPor = 'migracion-dax';
GO

INSERT INTO Rebate_AjusteManual (Ambito, NumManif, Tipo, Valor, Observacion, CreadoPor)
VALUES ('CAUSACION', 313614, 'REEMPLAZA',  57372, 'SWITCH CausacionPorRemesa; el ERP no trae causacion', 'migracion-dax'),
       ('CAUSACION', 313615, 'REEMPLAZA',  58563, 'SWITCH CausacionPorRemesa; el ERP no trae causacion', 'migracion-dax'),
       ('CAUSACION', 313655, 'REEMPLAZA',  49791, 'SWITCH CausacionPorRemesa; el ERP no trae causacion', 'migracion-dax'),
       ('CAUSACION', 318386, 'REEMPLAZA', 405043, 'SWITCH CausacionPorRemesa; el ERP no trae causacion', 'migracion-dax');
GO

SELECT Ambito, NumManif, Tipo, Valor, Activo, Observacion
FROM Rebate_AjusteManual ORDER BY Ambito, Tipo, NumManif;
GO
