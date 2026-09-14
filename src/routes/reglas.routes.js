'use strict';
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const repo   = require('../repositories/reglas.repo');
const motor  = require('../services/motorReglas');

const router = express.Router();

// TODO: reemplazar por el usuario autenticado del sistema
const usuarioDe = req => req.get('X-Usuario') || 'sistema';

const validar = (req, res, next) => {
  const e = validationResult(req);
  if (!e.isEmpty()) return res.status(400).json({ errores: e.array() });
  next();
};

const reglasRegla = [
  body('Ambito').isIn(['FACTURA', 'FLETE']),
  body('Nombre').trim().isLength({ min: 3, max: 120 }),
  body('Prioridad').isInt({ min: 1, max: 9999 }),
  body('TipoCalculo').isIn(['PORCENTAJE', 'FIJO', 'POR_TONELADA']),
  body('Valor').isFloat({ min: 0 }),
  body('NitCliente').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }),
  body('VigenteDesde').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('VigenteHasta').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('rutas').optional().isArray()
];

router.get('/', async (req, res, next) => {
  try {
    res.json(await repo.listar({
      ambito: req.query.ambito,
      nit:    req.query.nit,
      soloActivas: req.query.activas === '1'
    }));
  } catch (e) { next(e); }
});

router.get('/:id', param('id').isInt(), validar, async (req, res, next) => {
  try {
    const r = await repo.obtener(+req.params.id);
    r ? res.json(r) : res.status(404).json({ error: 'Regla no encontrada' });
  } catch (e) { next(e); }
});

router.get('/:id/historial', param('id').isInt(), validar, async (req, res, next) => {
  try { res.json(await repo.historial(+req.params.id)); } catch (e) { next(e); }
});

router.post('/', reglasRegla, validar, async (req, res, next) => {
  try { res.status(201).json(await repo.crear(req.body, usuarioDe(req))); } catch (e) { next(e); }
});

router.put('/:id', param('id').isInt(), reglasRegla, validar, async (req, res, next) => {
  try {
    const r = await repo.actualizar(+req.params.id, req.body, usuarioDe(req));
    r ? res.json(r) : res.status(404).json({ error: 'Regla no encontrada' });
  } catch (e) { next(e); }
});

router.patch('/:id/estado',
  param('id').isInt(), body('activo').isBoolean(), validar,
  async (req, res, next) => {
    try {
      const r = await repo.cambiarEstado(+req.params.id, req.body.activo, usuarioDe(req));
      r ? res.json(r) : res.status(404).json({ error: 'Regla no encontrada' });
    } catch (e) { next(e); }
  });

/* Simulador: prueba un escenario contra las reglas vigentes sin tocar datos.
   Es la herramienta para validar una regla nueva antes de activarla. */
router.post('/simular', async (req, res, next) => {
  try {
    const { ambito = 'FACTURA', nitCliente, origen, destino, fecha,
            afiliado, tipoAfiVehic, valorBase = 0, pesoKg = 0 } = req.body;
    const reglas = await repo.listar({ ambito, soloActivas: true });
    res.json({
      entrada: { ambito, nitCliente, origen, destino, fecha, afiliado, tipoAfiVehic, valorBase, pesoKg },
      resultado: motor.aplicar(reglas, { nitCliente, origen, destino, fecha, afiliado, tipoAfiVehic },
                               { valorBase, pesoKg })
    });
  } catch (e) { next(e); }
});

module.exports = router;
