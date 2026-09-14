'use strict';
const sql = require('mssql');

const base = {
  server:   process.env.SQL_SERVER   || '127.0.0.1',
  port:     parseInt(process.env.SQL_PORT || '1433', 10),
  user:     process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  pool:     { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options:  {
    encrypt:              process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_TRUST_CERT !== 'false',
    enableArithAbort:     true
  },
  requestTimeout: 60000
};

const pools = {};

function build(name, database) {
  if (!pools[name]) {
    pools[name] = new sql.ConnectionPool({ ...base, database })
      .connect()
      .catch(err => { delete pools[name]; throw err; });
  }
  return pools[name];
}

/** Pool de SOLO LECTURA contra el ERP. */
const syscom = () => build('syscom', process.env.SQL_DB_SYSCOM || 'dbsyscomTras');

/** Pool de lectura/escritura de la base propia de reglas. */
const rebate = () => build('rebate', process.env.SQL_DB_REBATE || 'dbRebate');

async function cerrar() {
  for (const p of Object.values(pools)) {
    try { (await p).close(); } catch { /* ignorar */ }
  }
}

module.exports = { sql, syscom, rebate, cerrar };
