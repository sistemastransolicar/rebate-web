'use strict';
/* =====================================================================
   Por que no se puede leer el listado de afiliados.

   Uso:  node scripts\diagnosticar-listado.js

   Imprime cada paso ANTES de intentarlo y late cada segundo mientras
   espera, asi que si algo se cuelga se ve exactamente donde y no queda
   una consola muerta sin saber si esta lenta o trabada.
   No toca la base de datos: solo disco.
   ===================================================================== */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const t0 = Date.now();
const di = (...a) => console.log(String(Date.now() - t0).padStart(6) + ' ms  ' + a.join(' '));

function latido(que) {
  let s = 0;
  const r = setInterval(() => { s++; console.log(`         ... ${que}: ${s} s`); }, 1000);
  r.unref();
  return () => clearInterval(r);
}

async function paso(que, fn) {
  di(que + ' ...');
  const parar = latido(que);
  try {
    const r = await fn();
    parar(); di('   OK');
    return r;
  } catch (e) {
    parar(); di('   FALLO: ' + (e.code ? e.code + ' - ' : '') + e.message);
    throw e;
  }
}

const n = v => Number(v).toLocaleString('es-CO');

(async () => {
  const RUTA = process.env.RUTA_LISTADO_AFILIADOS || '';
  const HOJA = process.env.HOJA_LISTADO_AFILIADOS || 'EDINSO';
  di('ruta en .env :', RUTA || '(vacia)');
  di('hoja         :', HOJA);
  if (!RUTA) { console.log('\nFalta RUTA_LISTADO_AFILIADOS en el .env\n'); process.exit(1); }

  const dir = path.dirname(RUTA);

  await paso(`1. Abrir la carpeta ${dir}`, async () => {
    const st = await fs.promises.stat(dir);
    di('   es carpeta:', st.isDirectory());
  }).catch(() => {
    console.log('\n  Ni siquiera se abre la carpeta. Drive para escritorio no esta'
              + '\n  corriendo, o la unidad no esta montada para este usuario.\n');
    process.exit(1);
  });

  await paso('2. Listar la carpeta', async () => {
    const f = await fs.promises.readdir(dir);
    di('   ' + n(f.length) + ' entradas');
    for (const x of f.filter(x => x.toUpperCase().includes('AFILIAD'))) di('   parecido: ' + x);
  }).catch(() => { /* el diagnostico sigue sin esto */ });

  let real = null;
  for (const ext of ['', '.xlsx', '.xlsm', '.xlsb', '.xls', '.gsheet']) {
    try { if ((await fs.promises.stat(RUTA + ext)).isFile()) { real = RUTA + ext; break; } }
    catch (e) { /* sigue */ }
  }
  if (!real) {
    di('3. No se resolvio ningun archivo a partir de la ruta');
    console.log('\n  Lo mas probable es que lo hayan renombrado. Compara con la lista'
              + '\n  de arriba y ajusta RUTA_LISTADO_AFILIADOS en el .env.\n');
    process.exit(1);
  }
  di('3. archivo resuelto:', real);
  if (real.endsWith('.gsheet')) {
    console.log('\n  Es un atajo de Google, no un libro con datos. Hay que exportar'
              + '\n  la hoja a .xlsx en el Drive.\n');
    process.exit(1);
  }

  const st = await paso('4. Fecha y tamano (metadatos)', async () => {
    const s = await fs.promises.stat(real);
    di('   bytes      :', n(s.size));
    di('   modificado :', new Date(s.mtimeMs).toISOString());
    return s;
  }).catch(() => process.exit(1));

  await paso('5. Abrir el archivo (sin leerlo)', async () => {
    const fd = await fs.promises.open(real, 'r');
    await fd.close();
  }).catch(() => {
    console.log('\n  Se ve el archivo pero no se puede abrir: hay un bloqueo.'
              + '\n  Cierralo en Excel, o Drive lo esta reponiendo en este momento.\n');
    process.exit(1);
  });

  await paso('6. Leer los primeros 4 KB', async () => {
    const fd = await fs.promises.open(real, 'r');
    const b = Buffer.alloc(4096);
    const { bytesRead } = await fd.read(b, 0, 4096, 0);
    await fd.close();
    const firma = b.slice(0, 2).toString('hex');
    di('   leidos:', n(bytesRead), '| firma:', firma,
       firma === '504b' ? '(PK, es un xlsx)' : '(NO parece un xlsx)');
  }).catch(() => process.exit(1));

  const buf = await paso(`7. Leer el archivo completo (${n(st.size)} bytes)`,
    () => fs.promises.readFile(real)).catch(() => {
      console.log('\n  Los metadatos si se leen pero el contenido no baja: eso es Drive.'
                + '\n  El archivo esta "en la nube" y no en el disco. Marcalo como'
                + '\n  "Disponible sin conexion" (clic derecho sobre el archivo en el'
                + '\n  Explorador) para que quede fijo en el disco local.\n');
      process.exit(1);
    });

  await paso('8. Interpretar el libro', async () => {
    const { parsear } = require('../src/services/leerXlsx');
    const { filas, hoja, hojas } = parsear(buf, HOJA);
    di('   hojas del libro:', hojas.join(', '));
    di('   hoja usada     :', hoja);
    di('   filas          :', n(filas.length));
  }).catch(() => {
    console.log('\n  El archivo baja completo pero no se deja interpretar. Puede que'
              + '\n  Drive lo haya dejado a medias: vuelve a intentarlo en un minuto.\n');
    process.exit(1);
  });

  await paso('9. Cargar el listado (el servicio real)', async () => {
    const afi = require('../src/services/afiliados');
    const e = await afi.refrescar();
    di('   ok         :', e.ok);
    di('   poseedores :', n(e.poseedores));
    di('   filas      :', n(e.filasLeidas));
    if (e.error) di('   error      :', e.error);
  });

  console.log('\nEl disco esta bien. Si sincronizar-afiliados.js se sigue colgando,'
            + '\nentonces es la conexion a la base de datos, no el archivo.\n');
  process.exit(0);
})().catch(e => { console.error('\nERROR no previsto:', e); process.exit(1); });
