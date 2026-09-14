'use strict';
/* Estado del listado de afiliados, para el aviso de la plataforma. */
const express = require('express');
const sincro  = require('../services/sincronizarAfiliados');
const router  = express.Router();

router.get('/estado', async (req, res, next) => {
  try { res.json(await sincro.estadoTabla()); }
  catch (e) { next(e); }
});

/* Reintento a mano desde el boton del aviso. Vuelve a leer el archivo y,
   si cambio, lo sincroniza. Es asincrono, asi que una lectura trabada
   demora esta peticion pero no bloquea el resto de la plataforma; y
   ademas afiliados.js se rinde sola a los 30 s.

   NO se pasa forzar: eso saltaria la guarda que impide sincronizar
   cuando el listado se desploma de golpe, y esa guarda es justamente la
   que protege de una lectura a medias. Un boton de la pantalla no debe
   poder vaciar la tabla de afiliados. Para forzar de verdad esta
   scripts\sincronizar-afiliados.js forzar, que lo corre alguien a
   conciencia. */
router.post('/refrescar', async (req, res, next) => {
  try {
    const r = await sincro.sincronizar({ usuario: 'manual' });
    res.json({ resultado: r, estado: await sincro.estadoTabla() });
  } catch (e) { next(e); }
});

module.exports = router;
