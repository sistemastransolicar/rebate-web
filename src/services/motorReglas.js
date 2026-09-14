'use strict';
/* =====================================================================
   Motor de resolucion de reglas de descuento.

   Replica la semantica del SWITCH de DAX: primera coincidencia gana.
   El orden lo define Prioridad (menor = mas especifica = se evalua antes).

   Ambito FACTURA  -> base de calculo: valor facturado y peso de la linea.
   Ambito FLETE    -> base de calculo: el pago del flete.
   ===================================================================== */

const norm = v => (v === null || v === undefined) ? '' : String(v).trim().toUpperCase();

/** ¿Esta ruta concreta calza con el origen/destino del viaje? */
function calzaRuta(rt, origen, destino) {
  const o = norm(origen), d = norm(destino);
  const ro = norm(rt.Origen), rd = norm(rt.Destino);
  const okO = !ro || (rt.OrigenOperador  === 'CONTIENE' ? o.includes(ro) : o === ro);
  const okD = !rd || (rt.DestinoOperador === 'CONTIENE' ? d.includes(rd) : d === rd);
  return okO && okD;
}

/**
 * ¿La ruta del manifiesto coincide con las rutas de la regla?
 * Sin rutas = cualquier ruta.
 * Rutas normales: basta que calce una (OR).
 * Rutas con Excluir=1: si calza una, la regla NO aplica. Asi se expresa
 * el "en todas las rutas salvo estas" del grupo del 7% del BI.
 */
function coincideRuta(rutas, origen, destino) {
  if (!rutas || rutas.length === 0) return true;
  const excluidas = rutas.filter(rt => rt.Excluir);
  if (excluidas.some(rt => calzaRuta(rt, origen, destino))) return false;
  const incluidas = rutas.filter(rt => !rt.Excluir);
  if (incluidas.length === 0) return true;
  return incluidas.some(rt => calzaRuta(rt, origen, destino));
}

function coincideFecha(regla, fecha) {
  if (!fecha) return false;
  const f = fecha instanceof Date ? fecha : new Date(fecha);
  if (regla.VigenteDesde && f < new Date(regla.VigenteDesde)) return false;
  if (regla.VigenteHasta && f > new Date(regla.VigenteHasta)) return false;
  return true;
}

/**
 * Devuelve la primera regla aplicable, o null.
 * @param {Array}  reglas  ya filtradas por ambito y ordenadas por Prioridad ASC
 * @param {Object} ctx     { nitCliente, origen, destino, fecha, afiliado,
 *                           tipoAfiVehic, poseedorPreferencial }
 *
 * OJO con `afiliado`: en el BI un poseedor es afiliado si esta en el
 * listado que se mantiene aparte (tabla Rebate_Afiliado), NO por la marca
 * del ERP. Las dos fuentes no coinciden. Quien arma el ctx decide, pero
 * para dar lo mismo que el BI tiene que venir del listado.
 */
function resolver(reglas, ctx) {
  for (const r of reglas) {
    if (!r.Activo) continue;
    if (r.NitCliente && norm(r.NitCliente) !== norm(ctx.nitCliente)) continue;
    if (!coincideFecha(r, ctx.fecha)) continue;
    if (r.TipoAfiVehic && norm(r.TipoAfiVehic) !== norm(ctx.tipoAfiVehic)) continue;
    if (r.RequiereAfiliado === true  && !ctx.afiliado) continue;
    if (r.RequiereAfiliado === false &&  ctx.afiliado) continue;
    if (!coincideRuta(r.rutas, ctx.origen, ctx.destino)) continue;
    return r;
  }
  return null;
}

/**
 * Calcula el descuento de una regla.
 * @param {Object} regla
 * @param {Object} base  { valorBase, pesoKg }
 * @param {Object} ctx   { poseedorPreferencial }  (opcional)
 *
 * Si el poseedor es preferencial y la regla trae ValorPoseedorPref, ese
 * valor reemplaza a Valor. No es un tope: en CARBONES ANDINOS el valor
 * preferencial (6%) es mayor que el normal (5%).
 */
function calcular(regla, { valorBase = 0, pesoKg = 0 } = {}, ctx = {}) {
  if (!regla) return 0;
  const pref = ctx.poseedorPreferencial
            && regla.ValorPoseedorPref !== null
            && regla.ValorPoseedorPref !== undefined;
  const v   = Number(pref ? regla.ValorPoseedorPref : regla.Valor) || 0;
  const adi = Number(regla.ValorAdicional) || 0;
  const vb  = Number(valorBase) || 0;

  switch (regla.TipoCalculo) {
    case 'PORCENTAJE':          return vb * v;
    case 'FIJO':                return v;
    case 'POR_TONELADA':        return ((Number(pesoKg) || 0) / 1000) * v;
    case 'PORCENTAJE_MAS_FIJO': return vb * v + adi;
    case 'FLETE_MENOS_FIJO':    return Math.max(vb - v, 0);
    default:                    return 0;
  }
}

/** Resuelve y calcula en un paso. Devuelve el detalle para poder auditarlo. */
function aplicar(reglas, ctx, base) {
  const regla = resolver(reglas, ctx);
  const usoPref = !!(regla && ctx.poseedorPreferencial
                  && regla.ValorPoseedorPref !== null
                  && regla.ValorPoseedorPref !== undefined);
  return {
    idRegla:     regla ? regla.IdRegla : null,
    nombreRegla: regla ? regla.Nombre  : null,
    tipoCalculo: regla ? regla.TipoCalculo : null,
    valorRegla:  regla ? Number(usoPref ? regla.ValorPoseedorPref : regla.Valor) : null,
    poseedorPreferencial: usoPref,
    descuento:   calcular(regla, base, ctx)
  };
}

module.exports = { resolver, calcular, aplicar, coincideRuta, calzaRuta, coincideFecha };
