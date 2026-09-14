'use strict';
/* =====================================================================
   Presupuesto MENSUAL por agencia.

   De donde salen estos numeros
   ----------------------------
   Son los mismos de la hoja "Presupuesto" del BI. Alla la tabla de metas
   no viene de SQL: es la consulta Tabla_Base, que lee el libro
     C:\\Users\\Subgerente TIC\\Desktop\\ESCRITORIO 2\\SQL para Power BI\\
     TABLA BASE PRESUPUESTO.xlsx
   Aqui estan copiados a mano, a proposito, mientras se valida el panel:
   asi la plataforma no depende de un archivo del escritorio de una sola
   maquina. Cuando el panel quede aprobado hay dos caminos mejores --
   pasarlos a una tabla en dbRebate, o leer ese mismo libro como se lee el
   listado de afiliados-- y cualquiera de los dos evita tener que tocar
   codigo para cambiar una meta.

   OJO: si alguien edita el libro, estos numeros NO se enteran.

   Que representan
   ---------------
   Son metas de UN MES. No lo dice el libro, se deduce de los datos: el
   total presupuestado son 101.000 t al mes y la operacion real de 2026 va
   entre 72.000 y 90.000 t mensuales. Si fueran anuales el cumplimiento
   daria casi 700%.
   ===================================================================== */

/* toneladas, ventas y utilidad del mes; utilidadTon es utilidad por
   tonelada y pctUtilidad el margen objetivo. Ojo: en el libro pctUtilidad
   NO es utilidad/ventas -- esta puesto a mano y no cuadra con la division
   (Bogota: 180/2.850 = 6,3% y la meta dice 4%). Se respeta como esta. */
const META_MENSUAL = {
  'BARRANQUILLA': { toneladas: 16000, ventas: 3040000000, utilidad: 240000000, utilidadTon: 15000, pctUtilidad: 0.08 },
  'BOGOTA':       { toneladas: 15000, ventas: 2850000000, utilidad: 180000000, utilidadTon: 12000, pctUtilidad: 0.04 },
  'BUCARAMANGA':  { toneladas:  3000, ventas:  345000000, utilidad:  36000000, utilidadTon: 12000, pctUtilidad: 0.06 },
  'BUENAVENTURA': { toneladas: 12000, ventas: 2220000000, utilidad: 192000000, utilidadTon: 16000, pctUtilidad: 0.09 },
  'CARTAGENA':    { toneladas: 13000, ventas: 1820000000, utilidad: 130000000, utilidadTon: 10000, pctUtilidad: 0.09 },
  'CUCUTA':       { toneladas: 11000, ventas: 1265000000, utilidad: 110000000, utilidadTon: 10000, pctUtilidad: 0.06 },
  'DUITAMA':      { toneladas: 11000, ventas: 2090000000, utilidad: 110000000, utilidadTon: 10000, pctUtilidad: 0.05 },
  'MEDELLIN':     { toneladas:  7000, ventas: 1260000000, utilidad: 140000000, utilidadTon: 20000, pctUtilidad: 0.07 },
  'SANTA MARTA':  { toneladas: 13000, ventas: 2405000000, utilidad: 156000000, utilidadTon: 12000, pctUtilidad: 0.08 }
};

/* Cuantos meses cubre el rango consultado.

   La meta es mensual y el informe se consulta por rango de fechas, asi
   que hay que llevarla al rango. Se cuenta mes por mes que tanto de cada
   uno cae adentro, no dividiendo los dias entre 30: febrero y enero no
   valen lo mismo, y un rango del 15 de enero al 15 de marzo son 2 meses
   justos y no 1,97.

   Devuelve 0 si el rango esta al reves o vacio; quien llama debe tratar
   eso como "sin meta", no como meta cero. */
function mesesDelRango(desde, hasta) {
  const d = new Date(`${desde}T00:00:00Z`);
  const h = new Date(`${hasta}T00:00:00Z`);
  if (Number.isNaN(d) || Number.isNaN(h) || h < d) return 0;

  let meses = 0;
  let anio = d.getUTCFullYear();
  let mes  = d.getUTCMonth();
  while (anio < h.getUTCFullYear() || (anio === h.getUTCFullYear() && mes <= h.getUTCMonth())) {
    const iniMes = Date.UTC(anio, mes, 1);
    const finMes = Date.UTC(anio, mes + 1, 0);          // ultimo dia del mes
    const diasMes = (finMes - iniMes) / 86400000 + 1;
    const ini = Math.max(iniMes, d.getTime());
    const fin = Math.min(finMes, h.getTime());
    if (fin >= ini) meses += ((fin - ini) / 86400000 + 1) / diasMes;
    mes++;
    if (mes > 11) { mes = 0; anio++; }
  }
  return meses;
}

/** Meta del rango para una agencia. null si esa agencia no tiene meta. */
function metaDe(agencia, meses) {
  const m = META_MENSUAL[String(agencia || '').trim().toUpperCase()];
  if (!m || !meses) return null;
  return {
    toneladas: m.toneladas * meses,
    ventas:    m.ventas    * meses,
    utilidad:  m.utilidad  * meses,
    /* Estas dos son razones, no acumulados: no se multiplican por los
       meses. Una meta de 15.000 $/t sigue siendo 15.000 $/t en un
       trimestre. */
    utilidadTon: m.utilidadTon,
    pctUtilidad: m.pctUtilidad
  };
}

/** Todas las agencias con meta, para poder mostrar las que no despacharon. */
const agenciasConMeta = () => Object.keys(META_MENSUAL);

module.exports = { META_MENSUAL, mesesDelRango, metaDe, agenciasConMeta };
