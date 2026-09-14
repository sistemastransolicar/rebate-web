'use strict';
/* =====================================================================
   Lector minimo de .xlsx, sin dependencias.

   Un .xlsx es un ZIP con XML adentro y Node ya trae zlib, asi que no
   hace falta instalar nada en el equipo. Solo lee: no escribe archivos.

   Devuelve la hoja como matriz de filas, y cada fila como objeto
   { A: 'valor', B: 'valor', ... }. No interpreta formatos ni fechas:
   todo sale como texto, que es lo que necesitamos para los NIT.
   ===================================================================== */
const fs   = require('fs');
const zlib = require('zlib');

/* ---------- ZIP ---------- */

function leerZip(buf) {
  /* El directorio central esta al final. Se busca su firma hacia atras,
     saltando el comentario final si lo hay. */
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('No parece un archivo .xlsx (no se encontro el fin del ZIP)');

  const cantidad = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entradas = new Map();

  for (let n = 0; n < cantidad; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const metodo   = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const largoNom = buf.readUInt16LE(p + 28);
    const largoExt = buf.readUInt16LE(p + 30);
    const largoCom = buf.readUInt16LE(p + 32);
    const offset   = buf.readUInt32LE(p + 42);
    const nombre   = buf.toString('utf8', p + 46, p + 46 + largoNom);
    entradas.set(nombre, { metodo, compSize, offset });
    p += 46 + largoNom + largoExt + largoCom;
  }
  return entradas;
}

function extraer(buf, entrada) {
  if (!entrada) return null;
  const o = entrada.offset;
  if (buf.readUInt32LE(o) !== 0x04034b50) throw new Error('Cabecera local del ZIP invalida');
  /* Los tamanos se toman del directorio central: la cabecera local puede
     traerlos en cero cuando el archivo se escribio en streaming. */
  const inicio = o + 30 + buf.readUInt16LE(o + 26) + buf.readUInt16LE(o + 28);
  const datos  = buf.slice(inicio, inicio + entrada.compSize);
  return entrada.metodo === 0 ? datos : zlib.inflateRawSync(datos);
}

/* ---------- XML ---------- */

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function desescapar(s) {
  if (s.indexOf('&') === -1) return s;
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (todo, e) => {
    if (e[0] === '#') {
      const cod = e[1] === 'x' || e[1] === 'X'
        ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cod) ? String.fromCodePoint(cod) : todo;
    }
    return ENTIDADES[e] !== undefined ? ENTIDADES[e] : todo;
  });
}

/* Cadenas compartidas: cada <si> puede venir partida en varios <t>. */
function leerCadenas(xml) {
  if (!xml) return [];
  const out = [];
  const si = /<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g;
  let m;
  while ((m = si.exec(xml)) !== null) {
    const cuerpo = m[1] || '';
    let texto = '', t;
    const rt = /<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g;
    while ((t = rt.exec(cuerpo)) !== null) texto += desescapar(t[1] || '');
    out.push(texto);
  }
  return out;
}

/* Numero de celda -> texto, sin notacion cientifica y sin inventar
   decimales. Solo toca lo que de verdad es un numero. */
function aTextoNumero(bruto) {
  const t = bruto.trim();
  if (!t || !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t)) return bruto;
  const n = Number(t);
  if (!Number.isFinite(n)) return bruto;
  if (Number.isInteger(n) && Math.abs(n) < 1e21) return n.toFixed(0);
  return String(n);
}

const columnaAIndice = letras => {
  let n = 0;
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
};

/** Convierte una hoja XML en un arreglo de filas { A: valor, B: valor, ... } */
function leerHoja(xml, cadenas) {
  const filas = [];
  /* Ojo con el orden y con la pereza de los cuantificadores: una fila o
     una celda AUTOCERRADA (<row .../>, <c .../>) tiene que probarse ANTES
     que la version con cierre, porque [^>]* tambien casa la barra y
     convertiria una celda vacia en una etiqueta de apertura que se traga
     todo hasta el siguiente cierre. Las hojas con VLOOKUP vienen llenas
     de celdas vacias con formato, asi que esto no es un caso raro. */
  const reFila = /<row\b([^>]*?)\/>|<row\b([^>]*?)>([\s\S]*?)<\/row>/g;
  let f;
  while ((f = reFila.exec(xml)) !== null) {
    const attrsFila = f[1] !== undefined ? f[1] : (f[2] || '');
    const cuerpo    = f[1] !== undefined ? '' : (f[3] || '');
    const rf = /\br="(\d+)"/.exec(attrsFila);
    if (!rf) continue;
    const nroFila = parseInt(rf[1], 10);
    const fila = {};
    const reCel = /<c\b([^>]*?)\/>|<c\b([^>]*?)>([\s\S]*?)<\/c>/g;
    let c;
    while ((c = reCel.exec(cuerpo)) !== null) {
      const autocerrada = c[1] !== undefined;
      const attrs  = autocerrada ? c[1] : (c[2] || '');
      const dentro = autocerrada ? '' : (c[3] || '');
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs);
      if (!ref) continue;
      const tipo = /\bt="([^"]+)"/.exec(attrs);
      /* t="e" es una celda en error (#N/A, #REF!...). No es un dato. */
      if (tipo && tipo[1] === 'e') continue;
      let valor = '';
      if (tipo && tipo[1] === 'inlineStr') {
        let t; const rt = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        while ((t = rt.exec(dentro)) !== null) valor += desescapar(t[1] || '');
      } else {
        const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(dentro);
        if (v) {
          valor = desescapar(v[1] || '');
          if (tipo && tipo[1] === 's') {
            const i = parseInt(valor, 10);
            valor = Number.isFinite(i) && cadenas[i] !== undefined ? cadenas[i] : '';
          } else if (!tipo || tipo[1] === 'n') {
            /* Los numeros de una celda numerica pueden venir en notacion
               cientifica (1.00237033E9). Lo hace el exportador de Google
               Sheets, y leerlo como texto convierte un NIT en basura:
               1002370330 se vuelve "100237033E9". Se pasa a entero plano. */
            valor = aTextoNumero(valor);
          }
        }
      }
      /* Un #N/A tambien llega como texto cuando la formula se guardo asi. */
      if (valor !== '' && valor[0] !== '#') fila[ref[1]] = valor;
    }
    filas[nroFila - 1] = fila;
  }
  for (let i = 0; i < filas.length; i++) if (!filas[i]) filas[i] = {};
  return filas;
}

/* ---------- API ---------- */

/**
 * Lee una hoja de un .xlsx.
 * @param {string} ruta    archivo .xlsx
 * @param {string} hoja    nombre de la hoja; si no se pasa, la primera
 * @returns {{ hoja:string, filas:Array<Object>, hojas:string[] }}
 */
function leerXlsx(ruta, hoja) {
  return parsear(fs.readFileSync(ruta), hoja);
}

/**
 * Igual que leerXlsx pero recibiendo el contenido ya leido. Se separa para
 * poder leer el archivo de forma asincrona: una lectura sincrona sobre una
 * unidad de red bloquea el hilo unico de Node y congela el servidor entero
 * si el archivo esta ocupado.
 * @param {Buffer} buf   contenido del .xlsx
 * @param {string} hoja  nombre de la hoja; si no se pasa, la primera
 */
function parsear(buf, hoja) {
  const zip = leerZip(buf);

  const workbook = extraer(buf, zip.get('xl/workbook.xml'));
  if (!workbook) throw new Error('El archivo no tiene xl/workbook.xml: no es un .xlsx valido');
  const wbXml = workbook.toString('utf8');

  const rels = extraer(buf, zip.get('xl/_rels/workbook.xml.rels'));
  const mapaRel = new Map();
  if (rels) {
    const re = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
    let m;
    while ((m = re.exec(rels.toString('utf8'))) !== null) mapaRel.set(m[1], m[2]);
    /* El atributo Target puede venir antes que Id */
    const re2 = /<Relationship\b[^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g;
    while ((m = re2.exec(rels.toString('utf8'))) !== null) mapaRel.set(m[2], m[1]);
  }

  const hojas = [];
  const reHoja = /<sheet\b[^>]*\/?>/g;
  let s;
  while ((s = reHoja.exec(wbXml)) !== null) {
    const nom = /\bname="([^"]*)"/.exec(s[0]);
    const rid = /\br:id="([^"]*)"/.exec(s[0]) || /\bid="([^"]*)"/.exec(s[0]);
    if (nom) hojas.push({ nombre: desescapar(nom[1]), rid: rid ? rid[1] : null });
  }
  if (!hojas.length) throw new Error('El archivo no declara ninguna hoja');

  const buscada = hoja
    ? hojas.find(h => h.nombre.trim().toUpperCase() === String(hoja).trim().toUpperCase())
    : hojas[0];
  if (!buscada) {
    throw new Error(`No existe la hoja "${hoja}". Hojas del archivo: ${hojas.map(h => h.nombre).join(', ')}`);
  }

  let destino = buscada.rid ? mapaRel.get(buscada.rid) : null;
  if (!destino) destino = 'worksheets/sheet' + (hojas.indexOf(buscada) + 1) + '.xml';
  destino = destino.replace(/^\/?xl\//, '').replace(/^\//, '');

  const entradaHoja = zip.get('xl/' + destino);
  if (!entradaHoja) throw new Error('No se encontro la hoja dentro del archivo: xl/' + destino);

  const cadenas = leerCadenas(
    (extraer(buf, zip.get('xl/sharedStrings.xml')) || Buffer.alloc(0)).toString('utf8'));

  return {
    hoja:  buscada.nombre,
    hojas: hojas.map(h => h.nombre),
    filas: leerHoja(extraer(buf, entradaHoja).toString('utf8'), cadenas)
  };
}

module.exports = { leerXlsx, parsear };
