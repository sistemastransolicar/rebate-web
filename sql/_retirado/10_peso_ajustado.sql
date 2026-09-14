/* =====================================================================
   dbRebate - Ajustes manuales de PESO DE FACTURA
   Migrados desde la medida DAX "Peso KG Ajustado" del modelo
   DASHBOARD_REBATE_FINAL (leida el 2026-09-09).

   El DAX hace dos cosas distintas y conviene no confundirlas:

     1. Seis manifiestos con el peso escrito a mano dentro de un SWITCH.
        Esos son los que quedan en esta tabla.

     2. Una regla general: si el peso de factura de la linea es 1, se
        toma como 34.000 kg. Eso NO es un ajuste por manifiesto sino una
        convencion, asi que vive en la consulta y no aqui. El 1 es el
        valor que queda cuando se factura "por viaje" y no por kilos.

   OJO: el ajuste del DAX es por MANIFIESTO, pero el peso es de la
   LINEA. En un manifiesto de varias lineas el DAX le pone el mismo
   valor a CADA UNA, con lo que el peso del manifiesto queda
   multiplicado. Y no es teorico: cinco de estos seis tienen varias
   lineas, medido en el modelo el 2026-09-09.

       Manif    Lineas   Peso real   Peso KG Ajustado (BI)
       316157      2       34.440          68.880
       316365      3       34.180         102.540
       316653      2       33.450          66.900
       316661      1       34.360          34.470
       317735      2       33.770          67.540
       318419      2       33.780          67.560

   Aqui el valor se reparte entre las lineas, asi que el manifiesto suma
   lo que dice esta tabla. La plataforma va a dar menos que el BI en
   estos seis, y esta bien.

   Ejecutar DESPUES de 09_causacion.sql
   ===================================================================== */
USE dbRebate;
GO

/* La tabla nacio aceptando 'BONO', despues 'CAUSACION'; ahora 'PESO'. */
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Aju_Ambito')
    ALTER TABLE Rebate_AjusteManual DROP CONSTRAINT CK_Aju_Ambito;
GO
ALTER TABLE Rebate_AjusteManual ADD CONSTRAINT CK_Aju_Ambito
    CHECK (Ambito IN ('BONO','CAUSACION','PESO'));
GO

DELETE FROM Rebate_AjusteManual
 WHERE Ambito = 'PESO' AND CreadoPor = 'migracion-dax';
GO

INSERT INTO Rebate_AjusteManual (Ambito, NumManif, Tipo, Valor, Observacion, CreadoPor)
VALUES ('PESO', 316157, 'REEMPLAZA', 34440, 'SWITCH Peso KG Ajustado', 'migracion-dax'),
       ('PESO', 316365, 'REEMPLAZA', 34180, 'SWITCH Peso KG Ajustado', 'migracion-dax'),
       ('PESO', 316653, 'REEMPLAZA', 33450, 'SWITCH Peso KG Ajustado', 'migracion-dax'),
       ('PESO', 316661, 'REEMPLAZA', 34470, 'SWITCH Peso KG Ajustado', 'migracion-dax'),
       ('PESO', 317735, 'REEMPLAZA', 33770, 'SWITCH Peso KG Ajustado', 'migracion-dax'),
       ('PESO', 318419, 'REEMPLAZA', 33780, 'SWITCH Peso KG Ajustado', 'migracion-dax');
GO

SELECT Ambito, NumManif, Tipo, Valor, Activo, Observacion
FROM Rebate_AjusteManual WHERE Ambito = 'PESO' ORDER BY NumManif;
GO
