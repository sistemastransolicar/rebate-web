#!/usr/bin/env node
/*  consulta-directa.js — ejecuta un .sql y escribe el resultado como CSV.
 *
 *  Las credenciales se leen de .env (que esta en .gitignore).
 *  Nunca se pasan por linea de comandos ni se imprimen.
 *
 *  Uso:  node scripts/consulta-directa.js sql/consultas/01_verificacion.sql
 *
 *  SOLO LECTURA: rechaza scripts con instrucciones de escritura.
 */
'use strict';
const fs   = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(raiz, '.env') });
const sql = require('mssql');

const PROHIBIDAS = /(^|\s)(insert|update|delete|drop|alter|create|truncate|merge|exec|execute|grant|deny|revoke|backup|restore)\s/i;

function limpiar(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

function aCsv(cols, filas) {
  const esc = v => {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
    const s = String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(','), ...filas.map(f => cols.map(c => esc(f[c])).join(','))].join('\n');
}

(async () => {
  const archivo = process.argv[2];
  if (!archivo) { console.error('Falta la ruta del .sql'); process.exit(1); }

  const texto = fs.readFileSync(archivo, 'utf8');
  if (PROHIBIDAS.test(limpiar(texto))) {
    console.error('BLOQUEADO: el script contiene instrucciones de escritura. Este puente es solo de lectura.');
    process.exit(2);
  }
  if (!process.env.SQL_USER || !process.env.SQL_PASSWORD) {
    console.error('Faltan SQL_USER / SQL_PASSWORD en .env');
    process.exit(3);
  }

  const cfg = {
    server:   process.env.SQL_SERVER || '127.0.0.1',
    port:     parseInt(process.env.SQL_PORT || '1433', 10),
    user:     process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_SYSCOM || 'dbsyscomTras',
    options:  { encrypt: process.env.SQL_ENCRYPT === 'true', trustServerCertificate: true },
    requestTimeout: 300000, connectionTimeout: 20000
  };

  console.log(`servidor : ${cfg.server}:${cfg.port} / ${cfg.database}`);
  console.log(`consulta : ${archivo}`);

  const pool = await sql.connect(cfg);
  const t0 = Date.now();
  const r  = await pool.request().query(texto);
  const ms = Date.now() - t0;

  const conjuntos = r.recordsets.length ? r.recordsets : [r.recordset || []];
  const dirSalida = path.join(raiz, 'sql', 'resultados');
  fs.mkdirSync(dirSalida, { recursive: true });
  const base = path.basename(archivo, '.sql');

  conjuntos.forEach((rs, i) => {
    const cols = rs.columns ? Object.keys(rs.columns) : Object.keys(rs[0] || {});
    const dest = path.join(dirSalida, conjuntos.length > 1 ? `${base}_${i}.csv` : `${base}.csv`);
    fs.writeFileSync(dest, aCsv(cols, rs), 'utf8');
    console.log(`  -> ${path.relative(raiz, dest)}  (${rs.length} filas)`);
  });

  console.log(`listo en ${(ms / 1000).toFixed(1)} s`);
  await pool.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
