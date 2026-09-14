'use strict';
/* =====================================================================
   Registro de errores en archivo.

   La consola del servidor se pierde: se cierra la ventana, se reinicia,
   o simplemente nadie la esta mirando cuando pasa la falla. Los errores
   de la API quedan aqui, con fecha y con la consulta que los produjo,
   para poder revisarlos despues.

   Se escribe con append y sin esperar: si el disco falla, la peticion
   igual responde. Un log que tumba la aplicacion es peor que no tenerlo.
   ===================================================================== */
const fs   = require('fs');
const path = require('path');

const CARPETA = path.join(__dirname, '..', '..', 'logs');
const ARCHIVO = path.join(CARPETA, 'errores.log');
const MAX_BYTES = 2 * 1024 * 1024;   // 2 MB y se rota

function rotar() {
  try {
    if (fs.statSync(ARCHIVO).size > MAX_BYTES)
      fs.renameSync(ARCHIVO, ARCHIVO.replace(/\.log$/, '.anterior.log'));
  } catch (e) { /* no existe todavia */ }
}

function anotar(donde, err, extra) {
  const linea = [
    '',
    '='.repeat(70),
    new Date().toISOString() + '  ' + donde,
    extra ? 'contexto: ' + JSON.stringify(extra) : null,
    'mensaje : ' + (err && err.message ? err.message : String(err)),
    err && err.number ? 'nro SQL : ' + err.number : null,
    err && err.originalError && err.originalError.message
      ? 'origen  : ' + err.originalError.message : null,
    err && err.precedingErrors && err.precedingErrors.length
      ? 'previos : ' + err.precedingErrors.map(e => e.message).join(' | ') : null,
    err && err.stack ? err.stack : null
  ].filter(x => x !== null).join('\n') + '\n';

  try {
    fs.mkdirSync(CARPETA, { recursive: true });
    rotar();
    fs.appendFile(ARCHIVO, linea, () => {});
  } catch (e) { /* si no se puede escribir, ni modo */ }
  console.error('[' + donde + ']', err && err.message ? err.message : err);
}

module.exports = { anotar, ARCHIVO };
