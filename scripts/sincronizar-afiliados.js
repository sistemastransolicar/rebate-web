'use strict';
/* Corre la sincronizacion del listado suelta, con el error completo.
   Uso:  node scripts\sincronizar-afiliados.js  [forzar]                  */
require('dotenv').config();
const afi    = require('../src/services/afiliados');
const sincro = require('../src/services/sincronizarAfiliados');
const { rebate, cerrar } = require('../src/config/db');

const forzar = process.argv.includes('forzar');

(async () => {
  const e = await afi.refrescar();
  console.log('\n--- archivo ---');
  console.log('  ', e.rutaReal || e.ruta, '| modificado', e.modificado);
  console.log('  ', e.poseedores, 'poseedores /', e.filasLeidas, 'filas');
  if (!e.ok) { console.log('\n  ' + e.error + '\n'); process.exit(1); }

  console.log('\n--- permisos sobre dbRebate ---');
  const pool = await rebate();
  for (const t of ['Rebate_Afiliado', 'Rebate_AfiliadoCarga']) {
    const r = await pool.request().query(`
      SELECT CAST(HAS_PERMS_BY_NAME('${t}','OBJECT','INSERT') AS INT) AS Ins,
             CAST(HAS_PERMS_BY_NAME('${t}','OBJECT','UPDATE') AS INT) AS Upd,
             CAST(HAS_PERMS_BY_NAME('${t}','OBJECT','SELECT') AS INT) AS Sel,
             CAST(OBJECT_ID('${t}') AS BIGINT) AS Existe`);
    const d = r.recordset[0];
    console.log(`   ${t.padEnd(22)} existe=${d.Existe ? 'si' : 'NO'}  select=${d.Sel}  insert=${d.Ins}  update=${d.Upd}`);
  }
  const quien = (await pool.request().query(
    "SELECT SUSER_SNAME() AS Login, USER_NAME() AS Usuario, DB_NAME() AS BaseActual")).recordset[0];
  console.log('   conectado como:', quien.Login, '/ usuario', quien.Usuario, '/ base', quien.BaseActual);

  console.log('\n--- sincronizacion ---');
  const r = await sincro.sincronizar({ usuario: 'diagnostico', forzar });
  console.log('  ', JSON.stringify({ ok: r.ok, poseedores: r.poseedores, agregados: r.agregados,
                                     retirados: r.retirados, sinCambios: r.sinCambios,
                                     motivo: r.motivo }, null, 1));
  if (!r.ok && r.detalle) {
    console.log('\n--- error completo ---');
    console.log(r.detalle && r.detalle.stack ? r.detalle.stack : r.detalle);
    if (r.detalle.originalError) console.log('\noriginalError:', r.detalle.originalError);
  }
  await cerrar();
  process.exit(r.ok ? 0 : 1);
})().catch(async e => { console.error('\nERROR:', e); try { await cerrar(); } catch (x) {} process.exit(1); });
