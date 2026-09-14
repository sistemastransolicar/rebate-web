'use strict';
const $   = s => document.querySelector(s);
const API = '/api/reglas';
const modal = () => bootstrap.Modal.getOrCreateInstance($('#modalRegla'));

let ambitoActual = 'FACTURA';
let reglasCargadas = [];
let ordenActual = 'Prioridad';
let dirActual   = 'asc';

const nf  = new Intl.NumberFormat('es-CO');
const cop = n => '$ ' + nf.format(Math.round(Number(n) || 0));
const esc = s => (s === null || s === undefined) ? '' :
  String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const ETIQUETA = {
  FACTURA: { titulo:'Condiciones de factura',
             ayuda:'Descuento que se le aplica al <strong>cliente</strong> sobre el valor facturado.',
             condicion:'Flota' },
  FLETE:   { titulo:'Condiciones de flete',
             ayuda:'Descuento que se le aplica al <strong>afiliado</strong> sobre el flete pagado.',
             condicion:'Afiliado / flota' }
};

function etiquetaValor(r){
  if (r.TipoCalculo === 'PORCENTAJE')
    return (Number(r.Valor) * 100).toFixed(2).replace(/\.?0+$/, '').replace('.', ',') + ' %';
  if (r.TipoCalculo === 'POR_TONELADA') return cop(r.Valor) + ' / ton';
  return cop(r.Valor);
}

function etiquetaVigencia(r){
  const f = d => d ? new Date(d).toISOString().slice(0,10) : null;
  const a = f(r.VigenteDesde), b = f(r.VigenteHasta);
  if (!a && !b) return '<span class="text-muted">siempre</span>';
  if (a && !b)  return 'desde ' + a;
  if (!a && b)  return 'hasta ' + b;
  return a + ' → ' + b;
}

function etiquetaCondicion(r){
  const p = [];
  if (r.RequiereAfiliado === true)  p.push('<span class="badge-cond">solo afiliados</span>');
  if (r.RequiereAfiliado === false) p.push('<span class="badge-cond">no afiliados</span>');
  if (r.TipoAfiVehic)               p.push('<span class="badge-cond">' + esc(r.TipoAfiVehic) + '</span>');
  return p.length ? p.join(' ') : '<span class="text-muted small">—</span>';
}

/* Un municipio tal como lo compara la regla. El asterisco significa que
   basta con que el nombre lo contenga: *CARTAGENA* calza con "CARTAGENA
   BOSQUE". Va marcado aparte para que no se lea como parte del nombre. */
function municipio(nombre, operador){
  if (!nombre) return '<span class="comodin">cualquiera</span>';
  return operador === 'CONTIENE'
    ? `<span class="comodin">*</span>${esc(nombre)}<span class="comodin">*</span>`
    : esc(nombre);
}

/* Las rutas de una regla migrada del DAX pueden ser diez pares
   origen-destino. Puestas en fila seguida son un muro de fichas que
   nadie lee.

   Se agrupan por origen, que es como estan escritas las condiciones de
   verdad ("desde GUACHETA a Sitionuevo o Cartagena"), y las excluidas se
   separan de las incluidas: mezclarlas hacia imposible ver a simple
   vista si una regla suma o resta rutas. */
function agrupar(rutas){
  const grupos = [];
  for (const rt of rutas) {
    const clave = (rt.Excluir ? 'X' : 'I') + '|' + (rt.Origen || '') + '|' + (rt.OrigenOperador || '');
    let g = grupos.find(x => x.clave === clave);
    if (!g) {
      g = { clave, excluir: !!rt.Excluir, origen: rt.Origen, op: rt.OrigenOperador, destinos: [] };
      grupos.push(g);
    }
    g.destinos.push(municipio(rt.Destino, rt.DestinoOperador));
  }
  /* Las excluidas de ultimas: primero se lee donde aplica y despues las
     excepciones. */
  return grupos.sort((a, b) => (a.excluir - b.excluir)
                            || String(a.origen || '').localeCompare(String(b.origen || '')));
}

const VISIBLES = 2;

function chipsRutas(rutas, id){
  if (!rutas || !rutas.length) return '<span class="text-muted small">todas</span>';
  const grupos = agrupar(rutas);
  const linea = g => `<div class="ruta-linea${g.excluir ? ' excluida' : ''}">`
    + `<span class="origen">${municipio(g.origen, g.op)}</span>`
    + `<span class="flecha-ruta">→</span>`
    + `<span class="destinos">${g.destinos.join(' · ')}</span></div>`;

  if (grupos.length <= VISIBLES) return `<div class="rutas">${grupos.map(linea).join('')}</div>`;

  const ocultos = grupos.length - VISIBLES;
  return `<div class="rutas" data-rutas="${id}">`
    + grupos.slice(0, VISIBLES).map(linea).join('')
    + `<div class="resto" hidden>${grupos.slice(VISIBLES).map(linea).join('')}</div>`
    + `<button type="button" class="mas-rutas" data-ver="${id}">`
    + `+ ${ocultos} ${ocultos === 1 ? 'ruta' : 'rutas'}</button>`
    + `</div>`;
}

async function contar(){
  for (const a of ['FACTURA','FLETE']) {
    try {
      const r = await (await fetch(`${API}?ambito=${a}&activas=1`)).json();
      $('#n-' + a).textContent = Array.isArray(r) ? r.length : '—';
    } catch { $('#n-' + a).textContent = '—'; }
  }
}

async function cargar(){
  const e = ETIQUETA[ambitoActual];
  $('#tituloLista').textContent = e.titulo;
  $('#thCondicion').textContent = e.condicion;
  $('#ambitoSim').textContent   = ambitoActual;

  const p = new URLSearchParams({ ambito: ambitoActual });
  if ($('#fNit').value.trim()) p.set('nit', $('#fNit').value.trim());
  if ($('#fActivas').checked)  p.set('activas', '1');

  const tbody = $('#tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Cargando…</td></tr>';
  try {
    const res = await fetch(`${API}?${p}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const reglas = await res.json();
    if (!reglas.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5">
        Todavía no hay condiciones de ${ambitoActual.toLowerCase()}.<br>
        <span class="small">${e.ayuda}</span></td></tr>`;
      return;
    }
    reglasCargadas = reglas;
    pintar();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-danger text-center py-4">Error: ${esc(err.message)}</td></tr>`;
  }
  contar();
}

/* Clave por la que se ordena cada columna. */
function clave(r, col) {
  switch (col) {
    case 'Prioridad':  return r.Prioridad;
    case 'Nombre':     return (r.Nombre || '').toUpperCase();
    case 'NitCliente': return r.NitCliente || '\uffff';           // los "todos" al final
    case 'Rutas':      return (r.rutas || []).length;
    case 'Vigencia':   return r.VigenteDesde ? new Date(r.VigenteDesde).getTime() : -Infinity;
    case 'Condicion':  return (r.RequiereAfiliado === true ? 'A' : r.RequiereAfiliado === false ? 'B' : 'C')
                            + (r.TipoAfiVehic || 'ZZ');
    case 'Valor':      return Number(r.Valor) || 0;
    default:           return r.Prioridad;
  }
}

function pintar() {
  const tbody = $('#tbody');
  const signo = dirActual === 'desc' ? -1 : 1;
  const orden = [...reglasCargadas].sort((a, b) => {
    const x = clave(a, ordenActual), y = clave(b, ordenActual);
    if (x < y) return -signo;
    if (x > y) return  signo;
    return a.Prioridad - b.Prioridad;          // desempate estable
  });

  document.querySelectorAll('#tbody, thead').forEach(() => {});
  document.querySelectorAll('th.orden').forEach(th => {
    th.classList.remove('asc', 'desc');
    if (th.dataset.orden === ordenActual) th.classList.add(dirActual);
  });

  tbody.innerHTML = orden.map(r => `
      <tr class="${r.Activo ? '' : 'inactiva'}">
        <td class="prioridad">${r.Prioridad}</td>
        <td>${esc(r.Nombre)}</td>
        <td class="small">${r.NitCliente ? esc(r.NitCliente) : '<span class="text-muted">todos</span>'}</td>
        <td>${chipsRutas(r.rutas, r.IdRegla)}</td>
        <td class="small">${etiquetaVigencia(r)}</td>
        <td>${etiquetaCondicion(r)}</td>
        <td class="text-end fw-semibold">${etiquetaValor(r)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-secondary" data-editar="${r.IdRegla}">Editar</button>
          <button class="btn btn-sm btn-outline-${r.Activo ? 'danger' : 'success'}"
                  data-estado="${r.IdRegla}" data-activo="${r.Activo ? 0 : 1}">
            ${r.Activo ? 'Desactivar' : 'Activar'}</button>
        </td>
      </tr>`).join('');
}

function filaRuta(rt = {}){
  const d = document.createElement('div');
  d.className = 'row g-2 mb-2 fila-ruta';
  d.innerHTML = `
    <div class="col-4"><input class="form-control form-control-sm" data-o placeholder="Origen" value="${esc(rt.Origen)||''}"></div>
    <div class="col-2"><select class="form-select form-select-sm" data-oo>
      <option value="IGUAL"${rt.OrigenOperador!=='CONTIENE'?' selected':''}>igual a</option>
      <option value="CONTIENE"${rt.OrigenOperador==='CONTIENE'?' selected':''}>contiene</option></select></div>
    <div class="col-4"><input class="form-control form-control-sm" data-d placeholder="Destino" value="${esc(rt.Destino)||''}"></div>
    <div class="col-1"><select class="form-select form-select-sm" data-dd>
      <option value="IGUAL"${rt.DestinoOperador!=='CONTIENE'?' selected':''}>=</option>
      <option value="CONTIENE"${rt.DestinoOperador==='CONTIENE'?' selected':''}>~</option></select></div>
    <div class="col-1"><button type="button" class="btn btn-sm btn-outline-danger w-100" data-quitar>&times;</button></div>`;
  d.querySelector('[data-quitar]').onclick = () => d.remove();
  return d;
}

function abrirModal(regla){
  const f = $('#formRegla');
  f.reset();
  $('#rutas').innerHTML = '';
  const amb = regla ? regla.Ambito : ambitoActual;
  f.Ambito.value = amb;
  $('#avisoAmbito').innerHTML = ETIQUETA[amb].ayuda;
  $('#modalTitulo').textContent = regla
    ? `Editar condición de ${amb.toLowerCase()} #${regla.IdRegla}`
    : `Nueva condición de ${amb.toLowerCase()}`;
  if (regla){
    for (const k of ['IdRegla','Nombre','NitCliente','Prioridad','TipoCalculo','Observacion','TipoAfiVehic'])
      if (f[k]) f[k].value = regla[k] ?? '';
    f.Valor.value = regla.Valor;
    f.VigenteDesde.value = regla.VigenteDesde ? new Date(regla.VigenteDesde).toISOString().slice(0,10) : '';
    f.VigenteHasta.value = regla.VigenteHasta ? new Date(regla.VigenteHasta).toISOString().slice(0,10) : '';
    f.RequiereAfiliado.value = regla.RequiereAfiliado === null ? '' : String(!!regla.RequiereAfiliado);
    (regla.rutas || []).forEach(rt => $('#rutas').appendChild(filaRuta(rt)));
  }
  modal().show();
}

function leerFormulario(){
  const f = $('#formRegla');
  const rutas = [...document.querySelectorAll('.fila-ruta')].map(el => ({
    Origen:  el.querySelector('[data-o]').value.trim() || null,
    OrigenOperador:  el.querySelector('[data-oo]').value,
    Destino: el.querySelector('[data-d]').value.trim() || null,
    DestinoOperador: el.querySelector('[data-dd]').value
  })).filter(r => r.Origen || r.Destino);

  return {
    Ambito: f.Ambito.value,
    Nombre: f.Nombre.value.trim(),
    NitCliente: f.NitCliente.value.trim() || null,
    Prioridad: +f.Prioridad.value,
    VigenteDesde: f.VigenteDesde.value || null,
    VigenteHasta: f.VigenteHasta.value || null,
    RequiereAfiliado: f.RequiereAfiliado.value === '' ? null : f.RequiereAfiliado.value === 'true',
    TipoAfiVehic: f.TipoAfiVehic.value || null,
    TipoCalculo: f.TipoCalculo.value,
    Valor: +f.Valor.value,
    Observacion: f.Observacion.value.trim() || null,
    Activo: true, rutas
  };
}

// --- eventos ---
$('#pestanas').addEventListener('click', ev => {
  const b = ev.target.closest('button[data-ambito]');
  if (!b) return;
  document.querySelectorAll('#pestanas .nav-link').forEach(x => x.classList.remove('activa'));
  b.classList.add('activa');
  ambitoActual = b.dataset.ambito;
  cargar();
});

$('#btnNueva').onclick   = () => abrirModal(null);
/* Desplegar el resto de rutas de una condicion. Se delega en el cuerpo
   de la tabla porque las filas se vuelven a pintar en cada consulta. */
$('#tbody').addEventListener('click', ev => {
  const b = ev.target.closest('button.mas-rutas'); if (!b) return;
  const caja = b.closest('.rutas'); const resto = caja.querySelector('.resto');
  const abierto = !resto.hidden;
  resto.hidden = abierto;
  const n = resto.querySelectorAll('.ruta-linea').length;
  b.textContent = abierto ? `+ ${n} ${n === 1 ? 'ruta' : 'rutas'}` : '− ver menos';
});

$('#btnAddRuta').onclick = () => $('#rutas').appendChild(filaRuta());
$('#fNit').addEventListener('change', cargar);
$('#fActivas').addEventListener('change', cargar);

$('#formRegla').TipoCalculo.addEventListener('change', ev => {
  $('#ayudaValor').textContent = { PORCENTAJE:'0.08 = 8%', FIJO:'Pesos por manifiesto',
                                   POR_TONELADA:'Pesos por tonelada' }[ev.target.value];
});

$('#formRegla').addEventListener('submit', async ev => {
  ev.preventDefault();
  const id = $('#formRegla').IdRegla.value;
  const res = await fetch(id ? `${API}/${id}` : API, {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(leerFormulario())
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert('Error: ' + JSON.stringify(e)); return; }
  modal().hide(); cargar();
});

$('#tbody').addEventListener('click', async ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.editar) {
    abrirModal(await (await fetch(`${API}/${b.dataset.editar}`)).json());
  } else if (b.dataset.estado) {
    if (!confirm('¿Confirmas el cambio de estado de esta condición?')) return;
    await fetch(`${API}/${b.dataset.estado}/estado`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ activo: b.dataset.activo === '1' })
    });
    cargar();
  }
});

$('#formSim').addEventListener('submit', async ev => {
  ev.preventDefault();
  const d = Object.fromEntries(new FormData(ev.target));
  d.ambito = ambitoActual;
  d.valorBase = +d.valorBase || 0;
  d.pesoKg    = +d.pesoKg    || 0;
  const r = await (await fetch(`${API}/simular`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(d)
  })).json();
  const res = r.resultado || {};
  $('#resultadoSim').innerHTML = res.idRegla
    ? `<div class="alert alert-success py-2 mb-0">
         <div class="small text-muted">Condición aplicada · ${ambitoActual}</div>
         <div class="fw-semibold">#${res.idRegla} · ${esc(res.nombreRegla)}</div>
         <div class="small">${esc(res.tipoCalculo)} · ${res.valorRegla}</div>
         <hr class="my-2">
         <div class="fs-5 fw-bold">${cop(res.descuento)}</div>
       </div>`
    : `<div class="alert alert-warning py-2 mb-0 small">
         Ninguna condición de ${ambitoActual.toLowerCase()} aplica a este escenario.
         El descuento sería 0.</div>`;
});

/* Clic en el titulo de una columna: ordena la lista ya cargada. */
document.querySelector('.card-body thead').addEventListener('click', ev => {
  const th = ev.target.closest('th.orden');
  if (!th || !reglasCargadas.length) return;
  const col = th.dataset.orden;
  if (ordenActual === col) dirActual = dirActual === 'asc' ? 'desc' : 'asc';
  else { ordenActual = col; dirActual = 'asc'; }
  pintar();
});

cargar();
