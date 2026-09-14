'use strict';
/* =====================================================================
   Acceso a la seccion de Condiciones.

   Las condiciones son las reglas con las que se calcula el dinero: quien
   entre ahi puede cambiar lo que se le descuenta a un cliente o a un
   afiliado. El informe se puede mirar; esto no.

   Sin dependencias nuevas (npm install no corre en esta carpeta), asi
   que la sesion es una cookie firmada con HMAC-SHA256. No hay estado en
   el servidor: la cookie lleva su propio vencimiento y la firma impide
   que alguien la modifique.

   Lo que NO es: esto no identifica personas. Es una clave compartida
   para una seccion, no un sistema de usuarios. Si algun dia hay que
   saber QUIEN cambio una regla, hay que pasar a usuarios de verdad.
   ===================================================================== */
const crypto = require('crypto');

const CLAVE = process.env.CLAVE_CONDICIONES || '';
const HORAS = Number(process.env.HORAS_SESION || 8);

/* Si no hay secreto configurado se genera uno al arrancar. Consecuencia:
   al reiniciar el servidor todos vuelven a escribir la clave. Es
   preferible a dejar un secreto por defecto en el codigo, que seria el
   mismo en cualquier copia del proyecto y no protegeria nada. */
const SECRETO = process.env.SECRETO_SESION || crypto.randomBytes(32).toString('hex');

const COOKIE = 'rebate_condiciones';

/** ¿Esta configurada la clave? Si no, la seccion queda cerrada -- nunca
 *  abierta: un olvido en el .env no puede volverse una puerta abierta. */
const configurado = () => CLAVE.length > 0;

function firmar(texto) {
  return crypto.createHmac('sha256', SECRETO).update(texto).digest('hex');
}

/* Comparacion en tiempo constante. Se comparan los resumenes y no las
   cadenas: asi ambos lados miden lo mismo y la diferencia de longitud no
   filtra nada. */
function iguales(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function claveCorrecta(intento) {
  if (!configurado()) return false;
  return iguales(intento || '', CLAVE);
}

/* Cookies sin dependencia: el encabezado es "a=1; b=2". */
function leerCookie(req, nombre) {
  const crudo = req.headers.cookie || '';
  for (const parte of crudo.split(';')) {
    const i = parte.indexOf('=');
    if (i < 0) continue;
    if (parte.slice(0, i).trim() === nombre) {
      return decodeURIComponent(parte.slice(i + 1).trim());
    }
  }
  return null;
}

function autorizado(req) {
  if (!configurado()) return false;
  const c = leerCookie(req, COOKIE);
  if (!c) return false;
  const [venceEn, firma] = c.split('.');
  if (!venceEn || !firma) return false;
  if (Number(venceEn) < Date.now()) return false;
  const esperada = firmar(venceEn);
  /* Longitudes iguales garantizadas: ambas son un HMAC en hexadecimal. */
  if (firma.length !== esperada.length) return false;
  return crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada));
}

function abrirSesion(res) {
  const vence = Date.now() + HORAS * 3600 * 1000;
  const valor = `${vence}.${firmar(String(vence))}`;
  /* HttpOnly: el JavaScript de la pagina no puede leerla, asi que un
     script inyectado no se la lleva. Sin Secure porque esto corre en
     HTTP plano dentro de la red local; si algun dia sale a internet, hay
     que poner HTTPS y agregar Secure. */
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(valor)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${HORAS * 3600}`);
}

function cerrarSesion(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

/* ---------- freno a los intentos ----------
   Cinco intentos por origen cada quince minutos. No detiene a un atacante
   decidido, pero convierte "probar mil claves" en algo que toma dias, que
   es lo que hace inutil probar claves cortas. */
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 5;
const intentos = new Map();

function frenado(ip) {
  const r = intentos.get(ip);
  if (!r) return false;
  if (Date.now() - r.desde > VENTANA_MS) { intentos.delete(ip); return false; }
  return r.n >= MAX_INTENTOS;
}

function anotarFallo(ip) {
  const r = intentos.get(ip);
  if (!r || Date.now() - r.desde > VENTANA_MS) intentos.set(ip, { n: 1, desde: Date.now() });
  else r.n++;
}

const limpiarIntentos = ip => intentos.delete(ip);

/** Middleware para las rutas de API. Responde JSON, no una pagina. */
function exigir(req, res, next) {
  if (autorizado(req)) return next();
  res.status(401).json({
    error: configurado()
      ? 'Esta sección necesita la clave de Condiciones.'
      : 'La clave de Condiciones no está configurada en el servidor.',
    requiereClave: true
  });
}

module.exports = { configurado, claveCorrecta, autorizado, abrirSesion,
                   cerrarSesion, frenado, anotarFallo, limpiarIntentos, exigir,
                   MAX_INTENTOS };
