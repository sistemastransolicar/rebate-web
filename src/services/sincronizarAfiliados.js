'use strict';
/* =====================================================================
   Sincroniza el listado de afiliados (hoja de calculo) hacia la tabla
   Rebate_Afiliado de dbRebate.

   Por que a la base y no solo en memoria: la columna AFILIADO del listado
   se ordena y se filtra en SQL, y las condiciones de flete se resuelven
   en SQL. Un Set en Node no sirve para eso.

   Se dispara sola cuando cambia la fecha de modificacion del archivo.
   Nunca borra: a quien sale del listado se le pone Activo = 0, para que
   quede el rastro de por que un viaje viejo se calculo como afiliado.
   ===================================================================== */
const { sql, rebate } = require('../config/db');
const afiliados = require('./afiliados');

/* Si una lectura trae muchisimos menos poseedores que la anterior, casi
   seguro se leyo mal (archivo a medio guardar, hoja renombrada). Antes de
   bajarle el descuento a media flota, mejor no sincronizar y avisar. */
const CAIDA_SOSPECHOSA = 0.70;   // menos del 70% de lo que habia
const MINIMO_RAZONABLE = 50;     // menos de esto no es un listado

let ultimoSincronizado = null;   // fecha de modificacion ya procesada
let enCurso = null;

async function sincronizar({ usuario = null, forzar = false } = {}) {
  /* Relee la hoja antes de comparar. Es asincrono a proposito: esta
     funcion la llama el temporizador del servidor, nunca una consulta. */
  const est = await afiliados.refrescar();
  if (!est.ok) return { ok: false, motivo: est.error };
  if (!forzar && ultimoSincronizado === est.modificado)
    return { ok: true, sinCambios: true, poseedores: est.poseedores };

  const ids = Array.from(afiliados.listado());
  if (ids.length < MINIMO_RAZONABLE)
    return { ok: false, motivo: `El listado solo trajo ${ids.length} poseedores. No se sincroniza.` };

  const pool = await rebate();

  const previos = (await pool.request()
      .query('SELECT COUNT(*) AS N FROM Rebate_Afiliado WHERE Activo = 1')).recordset[0].N;
  if (previos > 0 && ids.length < previos * CAIDA_SOSPECHOSA && !forzar) {
    return { ok: false, caidaSospechosa: true, previos, nuevos: ids.length,
             motivo: `El listado paso de ${previos} a ${ids.length} poseedores activos `
                   + `(-${Math.round((1 - ids.length / previos) * 100)}%). `
                   + 'No se sincroniza por si la lectura salio mal; revisa el archivo '
                   + 'o vuelve a lanzarlo con forzar=1 si el cambio es real.' };
  }

  /* La carga masiva de tedious NO ve las tablas temporales locales
     (#Nuevos da "Invalid object name"), asi que se usa una tabla de
     trabajo real. La crea el propio servicio: no hay que correr nada a
     mano. Se vacia antes y despues de cada carga. */
  await pool.request().query(`
    IF OBJECT_ID('Rebate_AfiliadoStage','U') IS NULL
    CREATE TABLE Rebate_AfiliadoStage (
        IdPoseedor VARCHAR(20)  NOT NULL,
        Nombre     VARCHAR(200) NULL,
        Agencia    VARCHAR(60)  NULL,
        Vehiculos  INT          NULL);
    DELETE FROM Rebate_AfiliadoStage;`);

  const tabla = new sql.Table('Rebate_AfiliadoStage');
  tabla.create = false;
  tabla.columns.add('IdPoseedor', sql.VarChar(20),  { nullable: false });
  tabla.columns.add('Nombre',     sql.VarChar(200), { nullable: true });
  tabla.columns.add('Agencia',    sql.VarChar(60),  { nullable: true });
  tabla.columns.add('Vehiculos',  sql.Int,          { nullable: true });
  for (const id of ids) {
    const d = afiliados.detalle(id) || {};
    tabla.rows.add(id,
      d.nombre  ? String(d.nombre).slice(0, 200) : null,
      d.agencia ? String(d.agencia).slice(0, 60) : null,
      d.vehiculos || null);
  }
  await pool.request().bulk(tabla);

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const conteo = (await new sql.Request(tx).query(`
      SELECT
        (SELECT COUNT(*) FROM Rebate_AfiliadoStage n
          WHERE NOT EXISTS (SELECT 1 FROM Rebate_Afiliado d
                             WHERE d.IdPoseedor = n.IdPoseedor AND d.Activo = 1)) AS Agregados,
        (SELECT COUNT(*) FROM Rebate_Afiliado d
          WHERE d.Activo = 1
            AND NOT EXISTS (SELECT 1 FROM Rebate_AfiliadoStage n
                             WHERE n.IdPoseedor = d.IdPoseedor)) AS Retirados;
    `)).recordset[0];

    await new sql.Request(tx)
      .input('archivo', sql.VarChar(260), (est.rutaReal || est.ruta || '').slice(0, 260))
      .input('u', sql.VarChar(50), usuario)
      .query(`
        MERGE Rebate_Afiliado AS d
        USING (SELECT IdPoseedor, MAX(Nombre) AS Nombre, MAX(Agencia) AS Agencia,
                      MAX(Vehiculos) AS Vehiculos
               FROM Rebate_AfiliadoStage GROUP BY IdPoseedor) AS n
           ON d.IdPoseedor = n.IdPoseedor
        WHEN MATCHED THEN UPDATE SET
            d.Nombre = n.Nombre, d.Agencia = n.Agencia, d.Vehiculos = n.Vehiculos,
            d.Activo = 1, d.FechaCarga = GETDATE(),
            d.CargadoPor = @u, d.ArchivoOrigen = @archivo
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (IdPoseedor, Nombre, Agencia, Vehiculos, Activo, CargadoPor, ArchivoOrigen)
            VALUES (n.IdPoseedor, n.Nombre, n.Agencia, n.Vehiculos, 1, @u, @archivo)
        WHEN NOT MATCHED BY SOURCE AND d.Activo = 1 THEN
            UPDATE SET d.Activo = 0, d.FechaCarga = GETDATE(), d.CargadoPor = @u;`);

    await new sql.Request(tx)
      .input('u', sql.VarChar(50), usuario)
      .input('archivo', sql.VarChar(260), (est.rutaReal || est.ruta || '').slice(0, 260))
      .input('pos', sql.Int, ids.length)
      .input('ag',  sql.Int, conteo.Agregados)
      .input('re',  sql.Int, conteo.Retirados)
      .query(`INSERT INTO Rebate_AfiliadoCarga
                (Usuario, ArchivoOrigen, Poseedores, Agregados, Retirados)
              VALUES (@u, @archivo, @pos, @ag, @re)`);

    await tx.commit();
    await pool.request().query('DELETE FROM Rebate_AfiliadoStage;');
    ultimoSincronizado = est.modificado;
    return { ok: true, poseedores: ids.length,
             agregados: conteo.Agregados, retirados: conteo.Retirados,
             modificado: est.modificado };
  } catch (e) {
    try { await tx.rollback(); } catch (e2) { /* ya estaba deshecha */ }
    /* No basta con e.message: los errores del driver a veces lo traen
       vacio y la causa real esta en originalError o en la lista de
       errores del lote. */
    const orig = e.originalError || (e.precedingErrors && e.precedingErrors[0]);
    const dentro = orig && orig.errors && orig.errors[0];
    const partes = [
      e.message,
      e.code ? `code=${e.code}` : null,
      e.number ? `nro=${e.number}` : null,
      orig && orig.message ? `origen: ${orig.message}` : null,
      dentro && dentro.message ? `sql: ${dentro.message}` : null
    ].filter(x => x && String(x).trim());
    return { ok: false,
             motivo: partes.length ? partes.join(' | ') : `error sin mensaje (${e.name || typeof e})`,
             detalle: e };
  }
}

/** Sincroniza si el archivo cambio. Una sola corrida a la vez. */
async function asegurar(opts) {
  if (enCurso) return enCurso;
  enCurso = sincronizar(opts).finally(() => { enCurso = null; });
  return enCurso;
}

/* =====================================================================
   Estado del listado, para mostrarlo en la plataforma.

   Lo que le importa a quien mira el informe no es si el archivo se abre
   en este instante, sino QUE TAN VIEJA es la lista con la que se estan
   calculando los descuentos. Por eso se combinan dos cosas:

     - lo que ve el proceso al leer el archivo de Drive (afiliados.estado)
     - la antiguedad de la ultima carga que si entro a Rebate_Afiliado,
       que es la tabla que realmente usan las consultas

   La edad se calcula en SQL con DATEDIFF contra GETDATE() para no
   depender de que el reloj del servidor de base y el del equipo esten
   en la misma zona horaria.
   ===================================================================== */
const AVISO_MIN  = Number(process.env.AFILIADOS_AVISO_MIN  || 60);    // 1 hora
const ALERTA_MIN = Number(process.env.AFILIADOS_ALERTA_MIN || 240);   // 4 horas
const CICLO_MS   = Number(process.env.REVISAR_LISTADO_MS   || 300000);

function humanizar(min) {
  if (min === null || min === undefined) return null;
  if (min < 1)   return 'hace menos de un minuto';
  if (min < 60)  return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `hace ${h} h ${min % 60} min`;
  const d = Math.floor(h / 24);
  return `hace ${d} dia${d === 1 ? '' : 's'}`;
}

async function estadoTabla() {
  const archivo = afiliados.estado();
  let carga = null, activos = null, errorBase = null;
  try {
    const pool = await rebate();
    const r = await pool.request().query(`
      SELECT TOP 1 Fecha, Usuario, Poseedores, Agregados, Retirados,
             DATEDIFF(minute, Fecha, GETDATE()) AS MinutosDesde
      FROM Rebate_AfiliadoCarga ORDER BY IdCarga DESC;
      SELECT COUNT(*) AS Activos FROM Rebate_Afiliado WHERE Activo = 1;`);
    carga   = r.recordsets[0][0] || null;
    activos = r.recordsets[1][0].Activos;
  } catch (e) {
    errorBase = e.message;
  }

  const edad = carga ? carga.MinutosDesde : null;

  /* OJO con medir salud por la antiguedad de la ultima carga: la hoja no
     cambia de noche, asi que a las 8 de la manana la ultima carga real
     puede ser de ayer y estar todo perfecto. Lo viejo no es sintoma de
     nada por si solo. Lo que si es sintoma:

       - que el ciclo de revision haya dejado de latir (nadie esta
         mirando el archivo, asi que un cambio no se enteraria)
       - que el archivo haya cambiado y ese cambio no haya entrado a la
         base (se lee bien pero la sincronizacion falla)

     La antiguedad solo pesa cuando ADEMAS el archivo no se puede leer:
     ahi si mide cuanto llevamos calculando a ciegas. */
  const latidoMs  = archivo.revisadoEn ? Date.now() - Date.parse(archivo.revisadoEn) : null;
  const sinLatido = latidoMs === null || latidoMs > Math.max(CICLO_MS * 3, 900000);
  const desfasado = archivo.ok && ultimoSincronizado
                 && archivo.modificado !== ultimoSincronizado;

  let nivel = 'ok', titulo = null, mensaje = null;

  if (activos === null) {
    nivel = 'alerta';
    titulo = 'No se puede consultar la tabla de afiliados';
    mensaje = 'Los descuentos de flete que dependen de si el poseedor es afiliado '
            + 'no son confiables en este momento. ' + (errorBase || '');
  } else if (!activos) {
    nivel = 'alerta';
    titulo = 'La tabla de afiliados esta vacia';
    mensaje = 'Ningun poseedor figura como afiliado, asi que TODOS estan calculando '
            + 'la tarifa de no afiliado. Hay que sincronizar el listado.';
  } else if (!archivo.ok) {
    const grave = edad === null || edad > ALERTA_MIN;
    nivel  = grave ? 'alerta' : 'aviso';
    titulo = 'Sin conexion con la hoja de afiliados en Drive';
    mensaje = `La plataforma esta usando la ultima lista que alcanzo a cargar `
            + `(${activos} poseedores, ${humanizar(edad) || 'sin fecha'}). `
            + (grave
                ? 'Con esa antiguedad, quien haya entrado o salido del listado desde '
                + 'entonces esta recibiendo el descuento equivocado.'
                : 'Los descuentos siguen siendo confiables por ahora, pero conviene '
                + 'destrabar Drive antes de que la lista envejezca.');
  } else if (sinLatido) {
    nivel = 'alerta';
    titulo = 'La revision automatica del listado se detuvo';
    mensaje = 'Nadie esta vigilando la hoja de Drive, asi que un cambio en el '
            + 'listado no se enteraria. Hay que reiniciar la plataforma.';
  } else if (desfasado) {
    nivel = 'alerta';
    titulo = 'La hoja cambio y el cambio no entro a la base';
    mensaje = 'El archivo se lee bien, pero la sincronizacion contra Rebate_Afiliado '
            + 'esta fallando, asi que los descuentos siguen con el listado anterior.';
  }

  return {
    nivel, titulo, mensaje,
    detalleArchivo: archivo.error || null,
    archivo: {
      ok: archivo.ok,
      ruta: archivo.rutaReal || archivo.ruta,
      poseedores: archivo.poseedores,
      leidoEn: archivo.leidoEn,
      modificado: archivo.modificado
    },
    ciclo: {
      latidoHace: latidoMs === null ? null : humanizar(Math.floor(latidoMs / 60000)),
      vivo: !sinLatido,
      alDia: !desfasado
    },
    tabla: {
      activos,
      ultimaCarga: carga ? carga.Fecha : null,
      hace: humanizar(edad),
      minutos: edad,
      origen: carga ? (carga.Usuario || '(servidor)') : null,
      agregados: carga ? carga.Agregados : null,
      retirados: carga ? carga.Retirados : null
    }
  };
}

module.exports = { sincronizar, asegurar, estadoTabla };
