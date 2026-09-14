'use strict';
const express = require('express');
const repo = require('../repositories/rebate.repo');
const router = express.Router();

router.get('/resumen', async (req, res, next) => {
  try { res.json(await repo.resumen(req.query)); }
  catch (e) { next(e); }
});

/* Descuentos y utilidad. Aparte del resumen porque recorre el conjunto
   enriquecido completo y tarda bastante mas. */
router.get('/resumen-descuentos', async (req, res, next) => {
  try { res.json(await repo.resumenDescuentos(req.query)); }
  catch (e) { next(e); }
});

/* Viajes por cliente, para el grafico del panel de analisis. Se pide solo
   cuando alguien abre ese panel, no en cada consulta. */
router.get('/viajes-cliente', async (req, res, next) => {
  try { res.json(await repo.viajesPorCliente(req.query)); }
  catch (e) { next(e); }
});

/* Nombres de agencia para el desplegable del filtro. No recibe filtros a
   proposito: la lista es siempre la misma, para que la agencia elegida no
   se caiga del desplegable al mover una fecha. */
router.get('/lista-agencias', async (req, res, next) => {
  try { res.json(await repo.listaAgencias()); }
  catch (e) { next(e); }
});

/* Cumplimiento por agencia: lo real del rango contra el presupuesto.

   El presupuesto es MENSUAL, asi que se lleva al rango consultado antes
   de comparar. El factor viaja en la respuesta para que la pantalla pueda
   decir contra que se esta midiendo -- una meta escalada y sin explicar
   es una meta en la que nadie cree. */
router.get('/agencias', async (req, res, next) => {
  try {
    const pres = require('../services/presupuestoAgencia');
    const d = await repo.cumplimientoAgencia(req.query);

    const desde = req.query.desde || process.env.FECHA_MINIMA || '2026-01-01';
    const hasta = req.query.hasta || new Date().toISOString().slice(0, 10);
    const meses = pres.mesesDelRango(desde, hasta);

    const porAgencia = new Map(d.filas.map(x => [x.agencia, x]));
    /* El universo son las agencias CON meta, no las que despacharon: una
       agencia que no movio nada en el rango tiene que salir, en cero, que
       es justamente la que hay que ver. */
    const filas = pres.agenciasConMeta().map(agencia => {
      const real = porAgencia.get(agencia)
        || { agencia, toneladas: 0, ventas: 0, utilidad: 0, manifiestos: 0, lineas: 0 };
      return { ...real, meta: pres.metaDe(agencia, meses) };
    }).sort((a, b) => b.ventas - a.ventas);

    /* Lo que despacho una agencia sin presupuesto (VOLQUETAS) queda FUERA
       de la tabla y tambien del total. Es a proposito: este panel compara
       contra una meta, y sumar al numerador algo que no tiene denominador
       infla el cumplimiento. Se devuelve aparte para poder decirlo en
       pantalla en vez de que el total quede corto sin explicacion. */
    const fuera = d.filas.filter(x => !pres.metaDe(x.agencia, meses || 1))
      .map(x => ({ agencia: x.agencia, toneladas: x.toneladas,
                   ventas: x.ventas, utilidad: x.utilidad, manifiestos: x.manifiestos }));

    res.json({ desde, hasta, meses, filas, fuera, ms: d.ms });
  } catch (e) { next(e); }
});

/* Descarga del informe en Excel, con los filtros que traiga la peticion. */
router.get('/exportar', async (req, res, next) => {
  try {
    const { armar } = require('../services/escribirXlsx');
    const columnas  = require('../services/columnasRebate');
    const d = await repo.exportar(req.query);

    const buf = armar({ hoja: 'Rebate', columnas, filas: d.filas });
    const rango = [req.query.desde, req.query.hasta].filter(Boolean).join('_a_') || 'informe';
    const nombre = `rebate_${rango}.xlsx`;

    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.setHeader('Content-Length', buf.length);
    /* Cabeceras propias para que la pantalla pueda avisar si la consulta
       se corto por el tope, cosa que el archivo por si solo no dice. */
    res.setHeader('X-Filas', String(d.filas.length));
    res.setHeader('X-Cortado', d.cortado ? '1' : '0');
    res.setHeader('Access-Control-Expose-Headers', 'X-Filas, X-Cortado');
    res.end(buf);
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try { res.json(await repo.listar(req.query)); }
  catch (e) { next(e); }
});

module.exports = router;
