'use strict';
require('dotenv').config();

const path    = require('path');
const express = require('express');
const db      = require('./config/db');
const acceso  = require('./services/acceso');

const app  = express();
const ARRANCADO_EN = new Date().toISOString();
const PORT = parseInt(process.env.PORT || '3050', 10);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
/* Version de los archivos estaticos: cambia en cada arranque, asi el
   navegador nunca sirve un css/js viejo desde su cache. */
const VERSION = Date.now().toString(36);
app.locals.v = VERSION;
app.use(express.static(path.join(__dirname, '..', 'public'), { etag: false, maxAge: 0 }));

app.use('/api/reglas', acceso.exigir, require('./routes/reglas.routes'));
app.use('/api/rebate', require('./routes/rebate.routes'));
app.use('/api/afiliados', require('./routes/afiliados.routes'));

app.get('/', (req, res) => res.redirect('/rebate'));
app.get('/rebate', (req, res) => {
  const hoy = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const minimo = process.env.FECHA_MINIMA || '2026-01-01';
  res.render('rebate', {
    titulo: 'Informe Rebate',
    desde: iso(primerDia) < minimo ? minimo : iso(primerDia),
    hasta: iso(hoy)
  });
});
/* ---------------------------------------------------------------------
   Condiciones: bajo clave.

   Es la seccion donde se cambia el dinero que se descuenta, asi que no
   basta con esconder el enlace. Se protege la PAGINA y tambien la API:
   si solo se protegiera la pagina, cualquiera con la direccion de
   /api/reglas podria leer y modificar las condiciones sin pasar por
   aqui.
   --------------------------------------------------------------------- */
app.get('/reglas', (req, res) => {
  if (acceso.autorizado(req)) return res.render('reglas', { titulo: 'Condiciones de Rebate' });
  res.render('entrar', { configurado: acceso.configurado(), error: null });
});

app.post('/reglas/entrar', (req, res) => {
  const quien = req.ip || req.socket.remoteAddress || 'desconocido';
  if (acceso.frenado(quien)) {
    return res.status(429).render('entrar', { configurado: acceso.configurado(),
      error: `Demasiados intentos fallidos. Espera unos minutos.` });
  }
  if (acceso.claveCorrecta(req.body && req.body.clave)) {
    acceso.limpiarIntentos(quien);
    acceso.abrirSesion(res);
    return res.redirect('/reglas');
  }
  acceso.anotarFallo(quien);
  /* El mensaje no distingue entre "clave mala" y "clave sin configurar":
     decirlo seria contarle al que prueba en que estado esta el sistema. */
  res.status(401).render('entrar', { configurado: acceso.configurado(),
    error: 'Clave incorrecta.' });
});

app.post('/reglas/salir', (req, res) => { acceso.cerrarSesion(res); res.redirect('/rebate'); });

app.get('/api/salud', async (req, res) => {
  /* arrancadoEn sirve para saber, de un vistazo, si el proceso que esta
     respondiendo es el que se reinicio hace un momento o uno viejo que
     quedo corriendo. Sirve mas de lo que parece: el servidor sirve los
     archivos estaticos desde disco, asi que un proceso sin reiniciar
     entrega el HTML y el JS nuevos pero no las rutas nuevas, y eso se ve
     como "la pantalla cambio pero no funciona". */
  const estado = { rebate: 'error', syscom: 'error',
                   arrancadoEn: ARRANCADO_EN,
                   rutas: ['/api/rebate', '/api/rebate/resumen',
                           '/api/rebate/resumen-descuentos', '/api/rebate/exportar',
                           '/api/afiliados/estado'] };
  try { await (await db.rebate()).request().query('SELECT 1'); estado.rebate = 'ok'; } catch (e) { estado.rebateError = e.message; }
  try { await (await db.syscom()).request().query('SELECT 1'); estado.syscom = 'ok'; } catch (e) { estado.syscomError = e.message; }
  res.status(estado.rebate === 'ok' && estado.syscom === 'ok' ? 200 : 503).json(estado);
});

// 404 en /api devuelve JSON, no la pagina HTML de Express
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.baseUrl}${req.path}`,
                         pista: 'Si acabas de agregar esta ruta, reinicia el servidor.' });
});

// Manejador de errores
app.use((err, req, res, next) => {
  /* Ademas de la consola, queda en logs/errores.log con la ruta y los
     filtros que lo produjeron. La consola se pierde al cerrar la ventana
     y las fallas casi nunca se ven en el momento en que ocurren. */
  require('./services/registro').anotar(`${req.method} ${req.originalUrl}`, err,
                                        Object.keys(req.query).length ? req.query : null);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

/* =====================================================================
   Listado de afiliados: revision periodica, FUERA de las consultas.

   El listado vive en una hoja de calculo (LISTADO VH AFILIADOS 2025.xlsx)
   que la operacion cambia todos los dias, en una unidad de Drive. Antes
   se releia dentro de cada consulta; eso era peligroso porque Node es de
   un solo hilo: con el archivo ocupado o la unidad lenta se congelaba la
   plataforma entera, no solo esa consulta.

   Ahora se revisa aparte, cada REVISAR_LISTADO_MS. Las consultas leen la
   tabla Rebate_Afiliado, que es lo que este ciclo mantiene al dia. Si la
   revision falla, la tabla conserva la ultima carga buena y la plataforma
   sigue respondiendo; el error queda en el log y en el estado.
   ===================================================================== */
const REVISAR_LISTADO_MS = Number(process.env.REVISAR_LISTADO_MS || 300000);
let avisoAfiliados = null;      // ultimo mensaje de falla, para no repetirlo

async function revisarAfiliados({ arranque = false } = {}) {
  const sincro = require('./services/sincronizarAfiliados');
  try {
    /* Queda anotado en Rebate_AfiliadoCarga.Usuario quien disparo la carga.
       Sin esto todas las del servidor salen con el usuario vacio y no hay
       forma de distinguir un reinicio de una revision del temporizador. */
    const r = await sincro.asegurar({ usuario: arranque ? 'arranque' : 'reloj' });
    if (r.ok) {
      avisoAfiliados = null;
      if (r.sinCambios) { if (arranque) console.log('  [afiliados] la base ya estaba al dia'); }
      else console.log(`  [afiliados] sincronizados: +${r.agregados} / -${r.retirados}`
                     + ` (${r.poseedores} poseedores)`);
    } else if (r.motivo !== avisoAfiliados) {
      /* Solo se avisa cuando el motivo cambia: si el archivo lleva horas
         ocupado no tiene sentido llenar el log con la misma linea. */
      avisoAfiliados = r.motivo;
      console.warn('  [afiliados] NO se sincronizo: ' + r.motivo);
    }
  } catch (e) {
    if (e.message !== avisoAfiliados) {
      avisoAfiliados = e.message;
      console.warn('  [afiliados] fallo la revision: ' + e.message);
    }
  }
}

const server = app.listen(PORT, async () => {
  console.log(`rebate-web escuchando en http://localhost:${PORT}`);
  await revisarAfiliados({ arranque: true });
  const est = require('./services/afiliados').estado();
  if (est.ok) console.log(`  [afiliados] ${est.poseedores} poseedores leidos de ${est.rutaReal}`);
});

/* unref: el temporizador no debe impedir que el proceso termine. */
const relojAfiliados = setInterval(revisarAfiliados, REVISAR_LISTADO_MS);
relojAfiliados.unref();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => { clearInterval(relojAfiliados); server.close(); await db.cerrar(); process.exit(0); });
}
