'use strict';
/* =====================================================================
   Diagnostico del listado de afiliados. Solo lectura.

   Uso (desde la carpeta del proyecto, en Windows):
       node scripts\probar-afiliados.js

   Comprueba tres cosas:
     1. Que el archivo de Drive se pueda abrir y leer.
     2. Que las identificaciones del listado casen con las del ERP.
     3. Que el resultado coincida con lo que calcula el BI.
   ===================================================================== */
require('dotenv').config();
const afi = require('../src/services/afiliados');
const { syscom } = require('../src/config/db');

const n = v => new Intl.NumberFormat('es-CO').format(v);

(async () => {
  console.log('\n=== 1. Lectura del archivo ===');
  const e = await afi.refrescar();
  console.log('  ruta en .env:', e.ruta);
  console.log('  archivo real:', e.rutaReal || '(no se resolvio)');
  console.log('  hoja        :', e.hoja);
  if (!e.ok) {
    console.log('\n  NO SE PUDO LEER:\n  ' + e.error);
    if (e.candidatos && e.candidatos.length) {
      console.log('\n  Archivos parecidos en esa carpeta:');
      console.table(e.candidatos);
      console.log('  Copia el nombre exacto a RUTA_LISTADO_AFILIADOS en el .env.');
    }
    console.log('');
    process.exit(1);
  }
  console.log('  modificado  :', e.modificado);
  console.log('  filas       :', n(e.filasLeidas));
  console.log('  poseedores  :', n(e.poseedores), '(distintos)');

  console.log('\n=== 2. Cruce contra el ERP (2026) ===');
  const pool = await syscom();
  const q = `
    SELECT m.IdPoseedor,
           MAX(CAST(tp.Fax AS VARCHAR(20))) AS Fax,
           MAX(tp.RazonSocial)              AS Nombre,
           COUNT(*)                         AS Lineas
    FROM Trn_TraRemesa r WITH (NOLOCK)
    JOIN Trn_TraRemMcias rm WITH (NOLOCK)
           ON rm.TipDoc='RMT' AND rm.NumOrden=r.NumOrden AND rm.IdCia=r.IdCia
    JOIN Trn_TraManifiesto m WITH (NOLOCK)
           ON m.TipDoc='MUC' AND m.Manifiesto=r.NumManif AND m.IdCia=r.IdCia
    JOIN Terceros tp WITH (NOLOCK) ON tp.IdTercero = m.IdPoseedor
    WHERE r.TipDoc='RMT' AND r.Fecha >= '2026-01-01' AND r.Fecha < '2027-01-01'
    GROUP BY m.IdPoseedor`;
  const filas = (await pool.request().query(q)).recordset;

  let posEnLista = 0, lineasEnLista = 0, lineasTotal = 0;
  const cruce = { 'ERP si / lista si': 0, 'ERP si / lista NO': 0,
                  'ERP no / lista SI': 0, 'ERP no / lista no': 0 };
  const discrepantes = [];

  for (const f of filas) {
    const enLista = afi.esAfiliado(f.IdPoseedor);
    const enErp   = String(f.Fax || '').trim() === '1';
    lineasTotal  += f.Lineas;
    if (enLista) { posEnLista++; lineasEnLista += f.Lineas; }
    const clave = enErp
      ? (enLista ? 'ERP si / lista si' : 'ERP si / lista NO')
      : (enLista ? 'ERP no / lista SI' : 'ERP no / lista no');
    cruce[clave] += f.Lineas;
    if (clave.includes('NO') || clave.includes('SI'))
      discrepantes.push({ Poseedor: f.IdPoseedor, Nombre: (f.Nombre||'').slice(0,34),
                          ERP: enErp ? 'AFILIADO' : 'NO', Lista: enLista ? 'SI' : 'no',
                          Lineas: f.Lineas });
  }

  console.log('  poseedores distintos en los datos :', n(filas.length));
  console.log('  de esos, afiliados segun la lista :', n(posEnLista));
  console.log('  lineas cubiertas por la lista     :', n(lineasEnLista), 'de', n(lineasTotal));

  console.log('\n=== 3. Contraste ERP vs listado (por lineas) ===');
  for (const [k, v] of Object.entries(cruce)) console.log('  ' + k.padEnd(20), n(v));

  console.log('\n  Compara estas cifras con las del BI:');
  console.log('    poseedores afiliados en datos   -> el BI da 764');
  console.log('    ERP si / lista si               -> el BI da 12.103');
  console.log('    ERP si / lista NO               -> el BI da 178');
  console.log('    ERP no / lista SI               -> el BI da 2.419');
  console.log('  Si cuadran, la plataforma esta leyendo el mismo listado que el BI.');

  if (discrepantes.length) {
    console.log('\n=== 4. Poseedores donde ERP y listado no coinciden (top 15 por lineas) ===');
    console.table(discrepantes.sort((a,b) => b.Lineas - a.Lineas).slice(0, 15));
    console.log('  Total de poseedores en desacuerdo:', n(discrepantes.length));
  }
  console.log('');
  process.exit(0);
})().catch(e => { console.error('\nERROR:', e.message, '\n'); process.exit(1); });
