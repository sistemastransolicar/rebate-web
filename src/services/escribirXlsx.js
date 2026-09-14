'use strict';
/* =====================================================================
   Generador de archivos .xlsx, sin dependencias.

   npm install no funciona sobre la carpeta donde vive el proyecto (falla
   al renombrar), asi que igual que con el lector, el archivo se arma
   aqui. Un .xlsx es un ZIP con unos XML adentro; Node trae zlib y con
   eso alcanza.

   No se exporta CSV a proposito: Excel interpreta el separador y el
   punto decimal segun la configuracion regional del equipo, y los mismos
   numeros se ven distinto en dos maquinas. En xlsx los numeros van como
   numeros y las fechas como fechas, y no hay nada que interpretar.

   Uso:
     armar({ hoja, columnas: [{titulo, clave, tipo, ancho}], filas })
   Tipos: texto | entero | identificador | decimal | moneda | fecha | porcentaje

   "identificador" es para numeros que NO son cantidades -- manifiesto,
   remesa, NIT, cedula, factura, cumplido --: van como numero, para que
   Excel los ordene y los busque bien, pero sin separador de miles.
   ===================================================================== */
const zlib = require('zlib');

const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* Arma el ZIP. Todo comprimido con deflate crudo, que es el metodo 8 que
   pide el formato. Sin ZIP64: 4 GB sobran para un informe. */
function zip(entradas) {
  const locales = [], central = [];
  let desplazamiento = 0;

  for (const { nombre, datos } of entradas) {
    const nom = Buffer.from(nombre, 'utf8');
    const comprimido = zlib.deflateRawSync(datos, { level: 6 });
    const crc = crc32(datos);

    const cab = Buffer.alloc(30);
    cab.writeUInt32LE(0x04034b50, 0);
    cab.writeUInt16LE(20, 4);
    cab.writeUInt16LE(0x0800, 6);
    cab.writeUInt16LE(8, 8);
    cab.writeUInt16LE(0, 10);
    cab.writeUInt16LE(0x21, 12);
    cab.writeUInt32LE(crc, 14);
    cab.writeUInt32LE(comprimido.length, 18);
    cab.writeUInt32LE(datos.length, 22);
    cab.writeUInt16LE(nom.length, 26);
    cab.writeUInt16LE(0, 28);
    locales.push(cab, nom, comprimido);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(8, 10);
    cen.writeUInt16LE(0, 12); cen.writeUInt16LE(0x21, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(comprimido.length, 20);
    cen.writeUInt32LE(datos.length, 24);
    cen.writeUInt16LE(nom.length, 28);
    cen.writeUInt32LE(desplazamiento, 42);
    central.push(cen, nom);

    desplazamiento += cab.length + nom.length + comprimido.length;
  }

  const dirCentral = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(dirCentral.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, dirCentral, fin]);
}

/* Excel rechaza el archivo COMPLETO si aparece un caracter de control que
   XML no admite, y en datos de un ERP aparecen. Se quitan antes. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const esc = v => String(v).replace(CONTROL, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Fecha a numero de serie de Excel. El origen es 30-dic-1899 por el
   1900 bisiesto que nunca existio y que Excel sigue arrastrando. */
function serieFecha(v) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((utc - Date.UTC(1899, 11, 30)) / 86400000);
}

const ESTILO = { texto: 0, entero: 1, moneda: 2, fecha: 3, porcentaje: 4, decimal: 5,
                 identificador: 7 };
const ESTILO_TITULO = 6;

function letra(n) {                       // 1 -> A, 27 -> AA
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; }
  return s;
}

function celda(ref, tipo, valor, estilo) {
  if (valor === null || valor === undefined || valor === '') return '';
  const e = estilo !== undefined ? estilo : (ESTILO[tipo] || 0);
  if (tipo === 'fecha') {
    const s = serieFecha(valor);
    return s === null ? '' : '<c r="' + ref + '" s="' + e + '"><v>' + s + '</v></c>';
  }
  if (tipo !== 'texto') {
    const n = Number(valor);
    if (Number.isFinite(n)) return '<c r="' + ref + '" s="' + e + '"><v>' + n + '</v></c>';
    /* Si un campo numerico trae texto se escribe como texto en vez de
       perderlo: mejor un dato raro visible que una celda vacia. */
  }
  return '<c r="' + ref + '" s="' + e + '" t="inlineStr"><is><t xml:space="preserve">'
       + esc(valor) + '</t></is></c>';
}

const CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
+ '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
+ '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
+ '<Default Extension="xml" ContentType="application/xml"/>'
+ '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
+ '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
+ '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
+ '</Types>';

const RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
+ '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
+ '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
+ '</Relationships>';

const RELS_LIBRO = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
+ '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
+ '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
+ '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
+ '</Relationships>';

const ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
+ '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
+ '<numFmts count="6">'
+ '<numFmt numFmtId="164" formatCode="#,##0"/>'
+ '<numFmt numFmtId="165" formatCode="&quot;$&quot;\\ #,##0"/>'
+ '<numFmt numFmtId="166" formatCode="dd/mm/yyyy"/>'
+ '<numFmt numFmtId="167" formatCode="0.0%"/>'
+ '<numFmt numFmtId="168" formatCode="#,##0.00"/>'
/* Identificadores: numero de verdad, pero SIN separador de miles. Un
   manifiesto o un NIT no se leen por magnitud, se comparan y se buscan;
   escritos "319.276" se copian mal a cualquier otro lado. */
+ '<numFmt numFmtId="169" formatCode="0"/>'
+ '</numFmts>'
+ '<fonts count="2">'
+ '<font><sz val="11"/><name val="Calibri"/></font>'
+ '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
+ '</fonts>'
+ '<fills count="3">'
+ '<fill><patternFill patternType="none"/></fill>'
+ '<fill><patternFill patternType="gray125"/></fill>'
+ '<fill><patternFill patternType="solid"><fgColor rgb="FF13315C"/><bgColor indexed="64"/></patternFill></fill>'
+ '</fills>'
+ '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
+ '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
+ '<cellXfs count="8">'
+ '<xf numFmtId="0"   fontId="0" fillId="0" borderId="0" xfId="0"/>'
+ '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
+ '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
+ '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
+ '<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
+ '<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
+ '<xf numFmtId="0"   fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
/* El titulo se quedo en el indice 6: los estilos nuevos se agregan
   DESPUES, nunca en el medio, o se corren todas las celdas ya escritas. */
+ '<xf numFmtId="169" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
+ '</cellXfs>'
+ '</styleSheet>';

/**
 * @param {object} o
 * @param {string} o.hoja      nombre de la pestaña (Excel corta en 31)
 * @param {Array}  o.columnas  [{ titulo, clave, tipo, ancho }]
 * @param {Array}  o.filas     objetos con las claves de las columnas
 * @returns {Buffer} el .xlsx listo para mandar
 */
function armar({ hoja = 'Datos', columnas, filas }) {
  const p = [];
  p.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  p.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">');
  /* La fila de titulos queda congelada: con 45 columnas y miles de filas,
     perder los encabezados al bajar vuelve el archivo inservible. */
  p.push('<sheetViews><sheetView tabSelected="1" workbookViewId="0">'
       + '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
       + '</sheetView></sheetViews>');
  p.push('<cols>' + columnas.map((c, i) =>
    '<col min="' + (i+1) + '" max="' + (i+1) + '" width="' + (c.ancho || 14) + '" customWidth="1"/>'
  ).join('') + '</cols>');
  p.push('<sheetData>');
  p.push('<row r="1">' + columnas.map((c, i) =>
    celda(letra(i+1) + '1', 'texto', c.titulo, ESTILO_TITULO)).join('') + '</row>');

  let n = 1;
  for (const f of filas) {
    n++;
    p.push('<row r="' + n + '">' + columnas.map((c, i) =>
      celda(letra(i+1) + n, c.tipo || 'texto', f[c.clave])).join('') + '</row>');
  }
  p.push('</sheetData>');
  /* Autofiltro sobre los titulos: es lo primero que hace cualquiera al
     abrir el archivo. */
  p.push('<autoFilter ref="A1:' + letra(columnas.length) + n + '"/>');
  p.push('</worksheet>');

  const libro = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheets><sheet name="' + esc(String(hoja).slice(0, 31)) + '" sheetId="1" r:id="rId1"/></sheets>'
    + '</workbook>';

  const b = t => Buffer.from(t, 'utf8');
  return zip([
    { nombre: '[Content_Types].xml',        datos: b(CONTENT_TYPES) },
    { nombre: '_rels/.rels',                datos: b(RELS) },
    { nombre: 'xl/workbook.xml',            datos: b(libro) },
    { nombre: 'xl/_rels/workbook.xml.rels', datos: b(RELS_LIBRO) },
    { nombre: 'xl/styles.xml',              datos: b(ESTILOS) },
    { nombre: 'xl/worksheets/sheet1.xml',   datos: b(p.join('')) }
  ]);
}

module.exports = { armar, serieFecha, letra };
