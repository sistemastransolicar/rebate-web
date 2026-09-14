'use strict';
const { sql, rebate } = require('../config/db');

const SELECT_BASE = `
  SELECT r.IdRegla, r.Ambito, r.Nombre, r.NitCliente, r.Prioridad,
         r.VigenteDesde, r.VigenteHasta, r.RequiereAfiliado, r.TipoAfiVehic,
         r.TipoCalculo, r.Valor, r.ValorPoseedorPref, r.ValorAdicional,
         r.Activo, r.Observacion,
         r.CreadoPor, r.FechaCreacion, r.ModificadoPor, r.FechaModificacion
  FROM Rebate_Regla r`;

async function listar({ ambito, nit, soloActivas } = {}) {
  const pool = await rebate();
  const req  = pool.request();
  const w = [];
  if (ambito)     { w.push('r.Ambito = @ambito');        req.input('ambito', sql.VarChar(10), ambito); }
  if (nit)        { w.push('r.NitCliente = @nit');       req.input('nit', sql.VarChar(20), nit); }
  if (soloActivas){ w.push('r.Activo = 1'); }
  const sqlTxt = `${SELECT_BASE}
    ${w.length ? 'WHERE ' + w.join(' AND ') : ''}
    ORDER BY r.Ambito, r.Prioridad, r.IdRegla`;

  const reglas = (await req.query(sqlTxt)).recordset;
  if (!reglas.length) return [];

  const rutas = (await pool.request().query(`
      SELECT IdRuta, IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir
      FROM Rebate_ReglaRuta ORDER BY IdRegla, IdRuta`)).recordset;

  const porRegla = new Map();
  for (const rt of rutas) {
    if (!porRegla.has(rt.IdRegla)) porRegla.set(rt.IdRegla, []);
    porRegla.get(rt.IdRegla).push(rt);
  }
  return reglas.map(r => ({ ...r, rutas: porRegla.get(r.IdRegla) || [] }));
}

async function obtener(idRegla) {
  const pool = await rebate();
  const r = (await pool.request()
      .input('id', sql.Int, idRegla)
      .query(`${SELECT_BASE} WHERE r.IdRegla = @id`)).recordset[0];
  if (!r) return null;
  r.rutas = (await pool.request()
      .input('id', sql.Int, idRegla)
      .query(`SELECT IdRuta, Origen, OrigenOperador, Destino, DestinoOperador, Excluir
              FROM Rebate_ReglaRuta WHERE IdRegla = @id ORDER BY IdRuta`)).recordset;
  return r;
}

function bindRegla(req, d) {
  req.input('ambito',     sql.VarChar(10),    d.Ambito);
  req.input('nombre',     sql.VarChar(120),   d.Nombre);
  req.input('nit',        sql.VarChar(20),    d.NitCliente || null);
  req.input('prioridad',  sql.Int,            d.Prioridad);
  req.input('desde',      sql.Date,           d.VigenteDesde || null);
  req.input('hasta',      sql.Date,           d.VigenteHasta || null);
  req.input('afiliado',   sql.Bit,            d.RequiereAfiliado === null || d.RequiereAfiliado === undefined ? null : d.RequiereAfiliado);
  req.input('tipoAfi',    sql.VarChar(20),    d.TipoAfiVehic || null);
  req.input('tipoCalc',   sql.VarChar(20),    d.TipoCalculo);
  req.input('valor',      sql.Decimal(18, 6), d.Valor);
  /* Valor que se usa cuando el poseedor esta en Rebate_PoseedorPreferencial.
     NULL = la regla no distingue poseedor. */
  req.input('valorPref',  sql.Decimal(18, 6), d.ValorPoseedorPref === undefined ? null : d.ValorPoseedorPref);
  /* Segundo valor, solo para TipoCalculo = PORCENTAJE_MAS_FIJO. */
  req.input('valorAdi',   sql.Decimal(18, 6), d.ValorAdicional === undefined ? null : d.ValorAdicional);
  req.input('activo',     sql.Bit,            d.Activo === undefined ? 1 : d.Activo);
  req.input('obs',        sql.VarChar(500),   d.Observacion || null);
}

async function insertarRutas(tx, idRegla, rutas = []) {
  for (const rt of rutas) {
    if (!rt.Origen && !rt.Destino) continue;
    await new sql.Request(tx)
      .input('id',  sql.Int,         idRegla)
      .input('o',   sql.VarChar(100), rt.Origen  ? rt.Origen.trim().toUpperCase()  : null)
      .input('oo',  sql.VarChar(10),  rt.OrigenOperador  || 'IGUAL')
      .input('d',   sql.VarChar(100), rt.Destino ? rt.Destino.trim().toUpperCase() : null)
      .input('dd',  sql.VarChar(10),  rt.DestinoOperador || 'IGUAL')
      .input('ex',  sql.Bit,          rt.Excluir ? 1 : 0)
      .query(`INSERT INTO Rebate_ReglaRuta
                (IdRegla, Origen, OrigenOperador, Destino, DestinoOperador, Excluir)
              VALUES (@id, @o, @oo, @d, @dd, @ex)`);
  }
}

async function crear(d, usuario) {
  const pool = await rebate();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const req = new sql.Request(tx);
    bindRegla(req, d);
    req.input('usuario', sql.VarChar(50), usuario || null);
    const id = (await req.query(`
      INSERT INTO Rebate_Regla
        (Ambito, Nombre, NitCliente, Prioridad, VigenteDesde, VigenteHasta,
         RequiereAfiliado, TipoAfiVehic, TipoCalculo, Valor, ValorPoseedorPref,
         ValorAdicional, Activo, Observacion, CreadoPor)
      OUTPUT INSERTED.IdRegla
      VALUES (@ambito, @nombre, @nit, @prioridad, @desde, @hasta,
              @afiliado, @tipoAfi, @tipoCalc, @valor, @valorPref,
              @valorAdi, @activo, @obs, @usuario)`))
      .recordset[0].IdRegla;

    await insertarRutas(tx, id, d.rutas);
    await new sql.Request(tx)
      .input('id', sql.Int, id)
      .input('snap', sql.NVarChar(sql.MAX), JSON.stringify(d))
      .input('u', sql.VarChar(50), usuario || null)
      .query(`INSERT INTO Rebate_ReglaHistorial (IdRegla, Accion, Snapshot, Usuario)
              VALUES (@id, 'CREAR', @snap, @u)`);
    await tx.commit();
    return obtener(id);
  } catch (e) { await tx.rollback(); throw e; }
}

async function actualizar(idRegla, d, usuario) {
  const anterior = await obtener(idRegla);
  if (!anterior) return null;

  const pool = await rebate();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const req = new sql.Request(tx);
    bindRegla(req, d);
    req.input('id', sql.Int, idRegla);
    req.input('usuario', sql.VarChar(50), usuario || null);
    await req.query(`
      UPDATE Rebate_Regla SET
        Ambito=@ambito, Nombre=@nombre, NitCliente=@nit, Prioridad=@prioridad,
        VigenteDesde=@desde, VigenteHasta=@hasta, RequiereAfiliado=@afiliado,
        TipoAfiVehic=@tipoAfi, TipoCalculo=@tipoCalc, Valor=@valor,
        ValorPoseedorPref=@valorPref, ValorAdicional=@valorAdi,
        Activo=@activo, Observacion=@obs,
        ModificadoPor=@usuario, FechaModificacion=GETDATE()
      WHERE IdRegla=@id`);

    await new sql.Request(tx).input('id', sql.Int, idRegla)
      .query('DELETE FROM Rebate_ReglaRuta WHERE IdRegla=@id');
    await insertarRutas(tx, idRegla, d.rutas);

    await new sql.Request(tx)
      .input('id', sql.Int, idRegla)
      .input('snap', sql.NVarChar(sql.MAX), JSON.stringify(anterior))
      .input('u', sql.VarChar(50), usuario || null)
      .query(`INSERT INTO Rebate_ReglaHistorial (IdRegla, Accion, Snapshot, Usuario)
              VALUES (@id, 'EDITAR', @snap, @u)`);
    await tx.commit();
    return obtener(idRegla);
  } catch (e) { await tx.rollback(); throw e; }
}

/** Nunca se borra una regla: se desactiva, para conservar la trazabilidad. */
async function cambiarEstado(idRegla, activo, usuario) {
  const anterior = await obtener(idRegla);
  if (!anterior) return null;
  const pool = await rebate();
  await pool.request()
    .input('id', sql.Int, idRegla)
    .input('activo', sql.Bit, activo)
    .input('u', sql.VarChar(50), usuario || null)
    .query(`UPDATE Rebate_Regla
              SET Activo=@activo, ModificadoPor=@u, FechaModificacion=GETDATE()
            WHERE IdRegla=@id;
            INSERT INTO Rebate_ReglaHistorial (IdRegla, Accion, Snapshot, Usuario)
            VALUES (@id, CASE WHEN @activo=1 THEN 'ACTIVAR' ELSE 'DESACTIVAR' END, '{}', @u);`);
  return obtener(idRegla);
}

async function historial(idRegla) {
  const pool = await rebate();
  return (await pool.request().input('id', sql.Int, idRegla)
    .query(`SELECT IdHistorial, Accion, Snapshot, Usuario, Fecha
            FROM Rebate_ReglaHistorial WHERE IdRegla=@id ORDER BY Fecha DESC`)).recordset;
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, historial };
