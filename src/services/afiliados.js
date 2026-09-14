'use strict';
/* =====================================================================
   Listado de poseedores AFILIADOS.

   El BI no usa la marca de afiliado del ERP: usa un listado que se
   mantiene en LISTADO VH AFILIADOS 2025.xlsx y que cambia todos los
   dias. Como la plataforma corre en el mismo equipo donde Drive
   sincroniza el archivo, se lee directo del disco y se relee cuando
   cambia la fecha de modificacion. Asi nunca hay una copia vieja.

   IMPORTANTE: refrescar() es asincrono y no se llama desde una consulta;
   lo dispara el temporizador de src/app.js. Node es de un solo hilo y el
   archivo vive en una unidad de red: leerlo de forma bloqueante dentro de
   una consulta congelaba el servidor entero cuando alguien dejaba el
   Excel abierto.

   Si el archivo no se puede leer, esto NO devuelve "nadie es afiliado":
   eso cambiaria los descuentos en silencio. Conserva la ultima copia
   buena y deja el error a la vista; si nunca hubo copia, listado()
   lanza y quien calcule el flete debe negarse.
   ===================================================================== */
const fs   = require('fs');
const path = require('path');
const { parsear } = require('./leerXlsx');

const RUTA = process.env.RUTA_LISTADO_AFILIADOS || '';
const HOJA = process.env.HOJA_LISTADO_AFILIADOS || 'EDINSO';
/* Cuanto se espera al disco antes de rendirse. El archivo esta en una
   unidad de Drive: si el demonio de Google esta reponiendo el archivo, o
   alguien lo tiene abierto, la lectura se puede quedar colgada para
   siempre. Sin este limite una sola lectura pegada dejaria la
   sincronizacion muerta hasta reiniciar el servicio. */
const LIMITE_MS = Number(process.env.LIMITE_LECTURA_LISTADO_MS || 30000);

/** Rechaza si la promesa no responde a tiempo. */
function conLimite(promesa, ms, que) {
  let reloj;
  const limite = new Promise((_, rechazar) => {
    reloj = setTimeout(() => rechazar(new Error(
      `${que} tardo mas de ${Math.round(ms / 1000)} s y se abandono. `
      + 'Suele ser Drive reponiendo el archivo o alguien que lo dejo abierto.')), ms);
    reloj.unref();
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(reloj));
}

const cache = {
  set: null,          // Set de identificaciones normalizadas
  detalle: null,      // Map id -> { nombre, agencia, vehiculos }
  mtime: 0,
  bytes: 0,
  filas: 0,
  poseedores: 0,
  leidoEn: 0,
  revisadoEn: 0,
  rutaReal: null,
  candidatos: null,
  error: null
};

/* Las identificaciones vienen con espacios, puntos o guion de
   verificacion segun quien las haya escrito. Se comparan sin nada de eso. */
function normalizar(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).trim().toUpperCase();
  const sinDv = s.includes('-') ? s.split('-')[0] : s;
  return sinDv.replace(/[^0-9A-Z]/g, '');
}

/** Busca la fila de encabezado y la columna de la identificacion. */
function ubicarColumnas(filas) {
  for (let i = 0; i < Math.min(filas.length, 30); i++) {
    const fila = filas[i];
    let colId = null, colNombre = null, colAgencia = null;
    for (const [col, val] of Object.entries(fila)) {
      const t = String(val).trim().toUpperCase().replace(/\s+/g, ' ');
      if (!colId      && /^ID\.? ?POSEEDOR$/.test(t))      colId = col;
      if (!colNombre  && t === 'POSEEDOR')                 colNombre = col;
      if (!colAgencia && t === 'AGENCIA')                  colAgencia = col;
    }
    if (colId) return { fila: i, colId, colNombre, colAgencia };
  }
  return null;
}

/* En el .env la ruta se puede escribir sin extension. Aqui se prueba tal
   cual y despues con las extensiones de libro de Excel. Un .gsheet NO es
   un libro: es un atajo de Drive al navegador, no trae datos. */
const EXTENSIONES = ['', '.xlsx', '.xlsm', '.xlsb', '.xls'];

function buscarArchivo(base) {
  for (const ext of EXTENSIONES) {
    const r = base + ext;
    try { if (fs.statSync(r).isFile()) return r; } catch (e) { /* sigue */ }
  }
  try {
    if (fs.statSync(base + '.gsheet').isFile()) {
      const err = new Error('gsheet');
      err.esGsheet = true;
      throw err;
    }
  } catch (e) { if (e.esGsheet) throw e; }
  return null;
}

/** Archivos del directorio que se parecen al buscado, para el diagnostico. */
function candidatos(base) {
  try {
    const dir  = path.dirname(base);
    const nom  = path.basename(base).toUpperCase().slice(0, 18);
    return fs.readdirSync(dir)
      .filter(f => f.toUpperCase().includes(nom))
      .map(f => {
        try { const st = fs.statSync(path.join(dir, f));
              return { nombre: f, bytes: st.size, modificado: new Date(st.mtimeMs).toISOString() }; }
        catch (e) { return { nombre: f }; }
      });
  } catch (e) { return []; }
}

/**
 * Resuelve la ruta del libro. Si no la encuentra deja cache.error con el
 * diagnostico y devuelve null. Es rapido: solo mira metadatos.
 */
function resolverRuta() {
  if (!RUTA) {
    cache.error = 'Falta RUTA_LISTADO_AFILIADOS en el archivo .env';
    return null;
  }
  let real = null;
  try {
    real = buscarArchivo(RUTA);
  } catch (e) {
    if (e.esGsheet) {
      cache.error = `${RUTA}.gsheet es una hoja nativa de Google: es un atajo al navegador, `
                  + 'no un archivo con datos. Para leerla hay que exportarla a .xlsx en el Drive '
                  + 'o conectarse por la API de Google.';
      return null;
    }
  }
  if (real) { cache.rutaReal = real; return real; }

  const cands = candidatos(RUTA);
  /* La causa mas comun es que renombraron el archivo, no que la unidad
     este caida: si la carpeta no existiera, statSync habria fallado con
     ENOENT sobre el directorio. Por eso se nombra primero esa posibilidad. */
  let dirExiste = false;
  try { dirExiste = fs.statSync(path.dirname(RUTA)).isDirectory(); } catch (e) { /* no */ }
  cache.error = `No se encontro el listado de afiliados a partir de ${RUTA}.`
    + (cands.length
        ? ' Archivos parecidos en esa carpeta: ' + cands.map(c => c.nombre).join(' | ')
          + '. Si lo renombraron, ajusta RUTA_LISTADO_AFILIADOS en el .env.'
        : dirExiste
          ? ' La carpeta si existe, asi que lo mas probable es que el archivo se haya'
            + ' renombrado o movido. Revisa el nombre y ajusta RUTA_LISTADO_AFILIADOS en el .env.'
          : ' Tampoco se puede abrir la carpeta que lo contiene: revisa que la unidad'
            + ' este montada y que Drive para escritorio este corriendo.');
  cache.candidatos = cands;
  return null;
}

/** ¿El archivo esta igual que la ultima vez que se leyo? */
const sinCambios = st => !!cache.set && st.mtimeMs === cache.mtime && st.size === cache.bytes;

/**
 * Convierte el contenido del libro en el listado y actualiza la cache.
 * Lanza si el libro no sirve; el que llama decide que hacer con el error.
 */
function procesar(buf, st) {
  const { filas, hoja, hojas } = parsear(buf, HOJA);
  const ub = ubicarColumnas(filas);
  if (!ub) {
    throw new Error(`la hoja "${hoja}" no tiene una columna "ID POSEEDOR" `
                  + `(hojas del archivo: ${hojas.join(', ')})`);
  }
  const set = new Set();
  const detalle = new Map();
  let leidas = 0;
  for (let i = ub.fila + 1; i < filas.length; i++) {
    const id = normalizar(filas[i][ub.colId]);
    if (!id) continue;
    leidas++;
    set.add(id);
    const d = detalle.get(id) || { nombre: null, agencia: null, vehiculos: 0 };
    d.vehiculos++;
    if (!d.nombre  && ub.colNombre)  d.nombre  = filas[i][ub.colNombre]  || null;
    if (!d.agencia && ub.colAgencia) d.agencia = filas[i][ub.colAgencia] || null;
    detalle.set(id, d);
  }
  if (set.size === 0) throw new Error('el listado no trajo ninguna identificacion');

  cache.set        = set;
  cache.detalle    = detalle;
  cache.mtime      = st.mtimeMs;
  cache.bytes      = st.size;
  cache.filas      = leidas;
  cache.poseedores = set.size;
  cache.leidoEn    = Date.now();
  cache.error      = null;
}

/**
 * Relee el archivo SIN bloquear el hilo: fs.promises va al pool de hilos,
 * asi que si el archivo esta ocupado se atasca esa lectura y no la
 * aplicacion entera. Es la que usa el servidor.
 * @returns {Promise<object>} el estado resultante
 */
async function refrescar() {
  const real = resolverRuta();
  cache.revisadoEn = Date.now();
  if (!real) return estado();
  try {
    const st = await conLimite(fs.promises.stat(real), LIMITE_MS, 'consultar la fecha del archivo');
    if (sinCambios(st)) { cache.error = null; return estado(); }
    /* AbortSignal si corta la lectura de verdad; el limite de arriba solo
       deja de esperarla. Se usan los dos: la senal para el caso normal y
       la carrera por si la senal no llega a aplicarse. */
    const buf = await conLimite(
      fs.promises.readFile(real, { signal: AbortSignal.timeout(LIMITE_MS) }),
      LIMITE_MS + 1000, 'leer el archivo');
    procesar(buf, st);
  } catch (e) {
    cache.error = `No se pudo leer el listado de afiliados (${real}): ${e.message}`;
  }
  return estado();
}

/** @returns {Set<string>} identificaciones normalizadas. Lanza si no hay listado. */
function listado() {
  if (!cache.set) throw new Error(cache.error || 'El listado de afiliados no esta disponible');
  return cache.set;
}

/** ¿Este poseedor es afiliado segun el listado? */
function esAfiliado(idPoseedor) {
  return listado().has(normalizar(idPoseedor));
}

/** Estado para mostrar en pantalla y para el diagnostico. */
function estado() {
  const c = cache;
  return {
    ok: !!c.set && !c.error,
    ruta: RUTA || null,
    rutaReal: c.rutaReal || null,
    candidatos: c.candidatos || null,
    hoja: HOJA,
    poseedores: c.poseedores,
    filasLeidas: c.filas,
    modificado: c.mtime ? new Date(c.mtime).toISOString() : null,
    leidoEn: c.leidoEn ? new Date(c.leidoEn).toISOString() : null,
    revisadoEn: c.revisadoEn ? new Date(c.revisadoEn).toISOString() : null,
    desactualizado: !!(c.set && c.error),   // hay copia en memoria pero fallo la relectura
    error: c.error
  };
}

function detalle(idPoseedor) {
  return cache.detalle ? cache.detalle.get(normalizar(idPoseedor)) || null : null;
}

module.exports = { esAfiliado, listado, estado, detalle, normalizar, refrescar };
