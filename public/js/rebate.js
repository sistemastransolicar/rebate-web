'use strict';
const $ = s => document.querySelector(s);
let paginaActual = 1;
let ordenActual = null;   // nombre de la columna
let dirActual   = null;   // 'asc' | 'desc'
let peticion    = null;   // consulta en vuelo, para poder cancelarla
/* Filas marcadas por el usuario. Se guarda la LLAVE de cada linea
   (manifiesto-remesa-item), no su posicion: asi la marca sobrevive a
   paginar, reordenar y volver a consultar. Va aqui arriba porque
   cargar() la usa y cargar() corre antes que el resto del archivo. */
const seleccionadas = new Set();

const nf  = new Intl.NumberFormat('es-CO');
const cop = n => n === null || n === undefined ? '' :
  new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n);
const fecha = v => v ? String(v).slice(0,10) : '';
/* dd/mm/aaaa para la banda: ahi se lee de corrido, no se compara. */
const fechaCorta = v => { const p = String(v || '').slice(0,10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : (v || ''); };
const esc = s => (s === null || s === undefined) ? '' :
  String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function parametros() {
  const p = new URLSearchParams(new FormData($('#filtros')));
  for (const [k, v] of [...p]) if (!v) p.delete(k);
  /* El % de descuento se escribe en porcentaje y viaja como fraccion, que
     es como esta guardada la tasa efectiva de cada linea. */
  for (const [campo, destino] of [['tasaMinPct','tasaMin'], ['tasaMaxPct','tasaMax']]) {
    const v = p.get(campo);
    p.delete(campo);
    if (v !== null && v !== '') {
      const n = Number(String(v).replace(',', '.'));
      if (Number.isFinite(n)) p.set(destino, (n / 100).toFixed(6));
    }
  }
  p.set('pagina', paginaActual);
  p.set('limite', 50);
  if (ordenActual) { p.set('orden', ordenActual); p.set('dir', dirActual); }
  return p;
}

/* Valores completos, sin abreviar. */
const moneda = n => '$ ' + nf.format(Math.round(Number(n) || 0));
const kilos  = n => nf.format(Math.round(Number(n) || 0)) + ' kg';
/* Entero de tabla. Un guion cuando el dato NO VIENE, en vez del "NaN" que
   suelta nf.format(undefined). Pasa cuando la pantalla ya tiene una columna
   nueva y el servidor todavia corre el codigo viejo, que es justo el
   momento en que uno necesita entender que esta pasando: un guion se lee
   como "no hay dato" y un NaN parece un error de calculo. */
const ent = n => (n === null || n === undefined || Number.isNaN(Number(n)))
  ? '—' : nf.format(Number(n));
/* La misma cifra en toneladas. Va debajo de los kilos, no en vez de
   ellos: el ERP liquida en kilos y ese es el numero que hay que poder
   comparar contra el cumplido; las toneladas son para leerlo de un
   vistazo. Una decima basta -- a esta escala el gramo no dice nada. */
const toneladas = n => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
                         .format((Number(n) || 0) / 1000) + ' t';
/* Porcentaje. Vacio cuando no hay valor: un 0% se lee como un resultado
   y aqui casi siempre significa que no hay factura contra que medir. */
const pct = v => v === null || v === undefined ? ''
  : new Intl.NumberFormat('es-CO', { style:'percent', minimumFractionDigits:1,
                                     maximumFractionDigits:1 }).format(v);
/* ¿El descuento de flete de esta linea es el general del 2,6/2,7%? Es el
   que la utilidad real devuelve, porque no es margen sino la comision de
   siempre. La franja es la misma que usa el BI. */
const enBanda27 = f => f.TasaDescuentoFlete !== null && f.TasaDescuentoFlete !== undefined
                    && Number(f.TasaDescuentoFlete) >= 0.022
                    && Number(f.TasaDescuentoFlete) <= 0.030;

/* Tarjeta de indicador.

   Recibe un objeto y no cinco argumentos sueltos: con progreso ya son
   cinco, y `tarjeta('X', '1', null, '', 0.5)` no se entiende al leerlo.

   @param {string}  rotulo
   @param {string}  valor     ya formateado
   @param {string}  pie
   @param {string}  modo      '' | 'acento' | 'alerta'
   @param {number}  progreso  0..1, o null si la tarjeta no es una parte
                              de un todo. Sin denominador NO se dibuja la
                              barra: una barra vacia se lee como 0%, que
                              es un dato, y aqui seria una mentira.
*/
/* Valor actual de un campo del formulario, para saber si el filtro que
   propone una tarjeta ya esta puesto. */
function valorCampo(nombre) {
  const e = $('#filtros').elements[nombre];
  return e ? e.value : '';
}

/* Una tarjeta de indicador.

   @param {string} rotulo
   @param {string} valor     ya formateado; "450 / 957" parte el denominador
   @param {string} pie
   @param {string} color     azul | rojo | cian | ambar | verde | '' (navy)
                             El color es la CATEGORIA de la cifra, no un
                             adorno: azul lo que entra, rojo lo que sale o
                             falta, cian el resultado, ambar el costo a
                             vigilar, verde lo cumplido.
   @param {string} insignia  pastilla con el porcentaje, opcional
   @param {number} progreso  0..1, o null si no es una parte de un todo
   @param {object} filtro    {campo, valor, texto} para filtrar al pulsar
   @param {bool}   cifraPie  el pie es una CIFRA (la misma magnitud en otra
                             unidad), no una leyenda: se pinta un poco mas
                             grande y en negrilla para que se lea como
                             numero y no como nota al pie
*/
function tarjeta({ rotulo, valor, pie, color = '', insignia = '',
                   progreso = null, filtro = null, cifraPie = false }) {
  // achica la letra cuando el numero es largo, para que no se desborde
  const clase = valor.length > 17 ? 'valor xs' : valor.length > 13 ? 'valor sm' : 'valor';
  /* "450 / 957": el denominador va en gris para que la parte y el todo se
     distingan sin leerlos. */
  const cifra = valor.replace(/ \/ (.+)$/, ' <span class="de">/ $1</span>');

  let barra = '';
  if (progreso !== null && Number.isFinite(progreso)) {
    const p = Math.max(0, Math.min(1, progreso));
    const pc = (p * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 });
    barra = `<div class="barra" role="progressbar" aria-valuenow="${pc}"`
          + ` aria-valuemin="0" aria-valuemax="100" title="${pc}%">`
          + `<i style="width:${p * 100}%"></i></div>`;
  }

  let atrib = '', accion = '', estado = '';
  if (filtro) {
    const activo = valorCampo(filtro.campo) === filtro.valor;
    atrib = ` data-campo="${filtro.campo}" data-valor="${filtro.valor}"`
          + ` role="button" tabindex="0"`
          + ` title="${activo ? 'Quitar el filtro y volver a ver todo'
                              : 'Filtrar la tabla para ver solo ' + filtro.texto}"`;
    estado = activo ? ' pulsable filtrada' : ' pulsable';
    accion = `<div class="accion">${activo
      ? '&#10005; quitar el filtro'
      : 'ver ' + filtro.texto + ' &rarr;'}</div>`;
  }

  return `<div class="col-12 col-sm-6 col-lg-4 col-xxl-3">
    <div class="kpi ${color}${estado}"${atrib}>
      <div class="filete"></div>
      <div class="contenido">
        <div class="rotulo">${rotulo}</div>
        <div class="${clase}">${cifra}</div>
        <div class="linea-pie">
          <div class="pie${cifraPie ? ' cifra' : ''}">${pie || '&nbsp;'}</div>
          ${insignia ? `<div class="insignia">${insignia}</div>` : ''}
        </div>
        ${accion}
        ${barra}
      </div>
    </div></div>`;
}

/* Un clic en una tarjeta con filtro lo pone o lo quita. Se delega en el
   contenedor porque las tarjetas se vuelven a crear en cada consulta. */
function alPulsarTarjeta(ev) {
  const k = ev.target.closest('.kpi[data-campo]');
  if (!k) return;
  if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
  ev.preventDefault();
  const campo = $('#filtros').elements[k.dataset.campo];
  if (!campo) return;
  /* Alternar y no solo poner: si solo pusiera, la tarjeta se volveria un
     callejon sin salida y habria que ir al panel a deshacerlo. */
  campo.value = campo.value === k.dataset.valor ? '' : k.dataset.valor;
  aplicarFiltros();
}
$('#kpis').addEventListener('click', alPulsarTarjeta);
$('#kpis').addEventListener('keydown', alPulsarTarjeta);

/* Fraccion segura: sin denominador no hay porcentaje que valga. */
const frac = (a, b) => Number(b) ? Number(a) / Number(b) : null;
const porc = (a, b) => {
  const f = frac(a, b);
  return f === null ? '' : (f * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + '%';
};

async function cargarKpis(senal) {
  const cont = $('#kpis');
  try {
    const r = await fetch('/api/rebate/resumen?' + parametros(), { signal: senal });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));

    /* La banda de arriba lleva el periodo y el volumen reales: puestos a
       mano se quedarian mintiendo al primer filtro. */
    const f = $('#filtros').elements;
    const bp = $('#bandaPeriodo');
    if (bp) bp.textContent =
      `Movimientos del ${fechaCorta(f.desde.value)} al ${fechaCorta(f.hasta.value)}`
      /* El conteo de manifiestos ya no va aqui: esta arriba en grande como
         "Despachos" y repetirlo en la misma banda solo cansa la vista. */
      + ` · ${nf.format(d.lineas)} líneas · ${nf.format(d.remesas)} remesas`;

    /* Las dos cifras de volumen. La unidad va en un span mas pequeño para
       que el numero pese mas que la palabra, pero sin sacarla de la cifra:
       "697.505" sin la "t" al lado se puede leer como kilos. */
    const ponerCifra = (sel, texto, unidad) => {
      const e = $(sel);
      if (!e) return;
      e.classList.remove('cargando');
      e.innerHTML = `${esc(texto)}<span class="u">${esc(unidad)}</span>`;
    };
    ponerCifra('#bandaDespachos', nf.format(d.manifiestos), '');
    ponerCifra('#bandaToneladas',
      new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
        .format(d.pesoFacturaKg / 1000), 't');

    cont.innerHTML =
        tarjeta({ rotulo:'Manifiestos', valor:nf.format(d.manifiestos),
                  pie:`${nf.format(d.remesas)} remesas · ${nf.format(d.lineas)} líneas` })
      /* Peso movilizado. El grande va en kilos, que es como liquida el
         ERP; las toneladas debajo son para dimensionarlo de un vistazo. */
      + tarjeta({ rotulo:'Peso movilizado', valor:kilos(d.pesoFacturaKg),
                  pie:toneladas(d.pesoFacturaKg), cifraPie:true,
                  /* Promedio por manifiesto: a esta escala es lo unico que
                     se puede contrastar de memoria contra una carga real. */
                  insignia:d.manifiestos
                    ? `${nf.format(Math.round(d.pesoFacturaKg / d.manifiestos))} kg por manifiesto`
                    : '' })
      + tarjeta({ rotulo:'Valor facturado', valor:moneda(d.valorFactura), color:'azul',
                  pie:'Antes de descuentos',
                  /* Antes repetia los kilos, que ahora tienen tarjeta
                     propia. La tarifa promedio si es dato nuevo. */
                  insignia:d.pesoFacturaKg
                    ? `${moneda(d.valorFactura / d.pesoFacturaKg)} por kg`
                    : '' })
      + tarjeta({ rotulo:'Pago de fletes', valor:moneda(d.vrPagoFletes), color:'rojo',
                  pie:'Antes de descuentos',
                  insignia:`${porc(d.vrPagoFletes, d.valorFactura)} de lo facturado` })
      + tarjeta({ rotulo:'Utilidad bruta', valor:moneda(d.utilidadBruta), color:'cian',
                  pie:'Facturado menos flete',
                  insignia:`margen ${porc(d.utilidadBruta, d.valorFactura)}` })
      /* Una sola tarjeta para la facturacion: las dos que habia decian lo
         mismo. Las remesas a medias solo se nombran cuando las hay -- un
         "0 a medias" permanente es ruido. */
      + tarjeta({ rotulo:'Facturación',
                  valor:`${nf.format(d.lineasFacturadas)} / ${nf.format(d.lineas)}`,
                  color: d.remesasParciales ? 'rojo' : (d.lineasSinFacturar ? 'azul' : 'verde'),
                  pie:'Líneas facturadas'
                      + (d.lineasSinFacturar ? ` · faltan ${nf.format(d.lineasSinFacturar)}` : '')
                      + (d.remesasParciales ? ` · ${nf.format(d.remesasParciales)} remesas a medias` : ''),
                  insignia:porc(d.lineasFacturadas, d.lineas),
                  progreso:frac(d.lineasFacturadas, d.lineas),
                  filtro:{ campo:'facturado', valor:'NO', texto:'lo que falta por facturar' } })
      + tarjeta({ rotulo:'Manifiestos cumplidos',
                  valor:`${nf.format(d.manifCumplidos)} / ${nf.format(d.manifiestos)}`,
                  color: d.manifSinCumplir ? 'verde' : 'verde',
                  pie: d.manifSinCumplir ? `Faltan ${nf.format(d.manifSinCumplir)} por cumplir`
                                         : 'Todos cumplidos',
                  insignia:porc(d.manifCumplidos, d.manifiestos),
                  progreso:frac(d.manifCumplidos, d.manifiestos),
                  filtro:{ campo:'cumplido', valor:'NO', texto:'los pendientes por cumplir' } })
      + tarjeta({ rotulo:'Manifiestos con ODP',
                  valor:`${nf.format(d.manifConODP)} / ${nf.format(d.manifiestos)}`,
                  color: d.manifSinODP ? 'rojo' : 'verde',
                  pie: d.manifSinODP ? `${nf.format(d.manifSinODP)} sin orden de pago`
                                     : 'Todos con orden de pago',
                  insignia:porc(d.manifConODP, d.manifiestos),
                  progreso:frac(d.manifConODP, d.manifiestos),
                  filtro:{ campo:'odp', valor:'NO', texto:'los que no tienen orden de pago' } });
  } catch (e) {
    if (e.name === 'AbortError') return;
    /* Si la consulta falla, la banda no puede quedarse con las cifras de
       la consulta anterior: dirian que corresponden a estos filtros. */
    for (const sel of ['#bandaDespachos', '#bandaToneladas']) {
      const c = $(sel);
      if (c) { c.classList.add('cargando'); c.textContent = 'no disponible'; }
    }
    cont.innerHTML = `<div class="col-12"><div class="alert alert-warning py-2 mb-0">`
      + `No se pudieron calcular los indicadores: ${esc(e.message)}</div></div>`;
  }
}

/* Los siete de dinero. Se piden aparte: su consulta recorre el conjunto
   enriquecido completo y tarda mas, asi que la tabla y los de arriba no
   tienen por que esperarlos. Mientras llegan se muestran en gris, no en
   blanco: un cero que todavia no es un cero engaña mas que decir que
   falta. */
async function cargarKpisDescuentos(senal) {
  const cont = $('#kpisDesc');
  const ROTULOS = [['Desc. factura','ambar'], ['Factura final','azul'],
                   ['Desc. flete','ambar'],   ['Flete final','rojo'],
                   ['Utilidad','cian'],       ['Utilidad real','cian'],
                   ['Descuento 2,7%','ambar'], ['Causaciones','ambar'],
                   ['Anticipos','rojo']];
  cont.innerHTML = ROTULOS.map(([r, c]) =>
    `<div class="col-12 col-sm-6 col-lg-4 col-xxl-3">
       <div class="kpi ${c} cargando"><div class="filete"></div>
       <div class="contenido"><div class="rotulo">${r}</div>
       <div class="valor">calculando…</div><div class="pie">&nbsp;</div></div></div></div>`).join('');
  try {
    const r = await fetch('/api/rebate/resumen-descuentos?' + parametros(), { signal: senal });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));

    /* Los descuentos se miden contra el valor ANTES de descontar, que es
       de donde salieron; el endpoint devuelve el valor ya neto. */
    const facturaBruta = d.facturaFinal + d.descFactura;
    const fleteBruto   = d.fleteFinal   + d.descFlete;

    cont.innerHTML =
        tarjeta({ rotulo:'Desc. factura', valor:moneda(d.descFactura), color:'ambar',
                  pie:'Se le descuenta al cliente',
                  insignia:`${porc(d.descFactura, facturaBruta)} de lo facturado` })
      + tarjeta({ rotulo:'Factura final', valor:moneda(d.facturaFinal), color:'azul',
                  pie:'Neto al cliente' })
      + tarjeta({ rotulo:'Desc. flete', valor:moneda(d.descFlete), color:'ambar',
                  pie:'Se le descuenta al poseedor',
                  insignia:`${porc(d.descFlete, fleteBruto)} del flete` })
      + tarjeta({ rotulo:'Flete final', valor:moneda(d.fleteFinal), color:'rojo',
                  pie:'Neto al poseedor' })
      + tarjeta({ rotulo:'Utilidad', valor:moneda(d.utilidad), color:'cian',
                  pie:'Factura final menos flete final',
                  insignia:`margen ${porc(d.utilidad, d.facturaFinal)}` })
      + tarjeta({ rotulo:'Utilidad real', valor:moneda(d.utilidadReal), color:'cian',
                  pie:'Sin contar el 2,7%',
                  insignia:`${porc(d.utilidadReal, d.utilidad)} de la utilidad` })
      + tarjeta({ rotulo:'Descuento 2,7%', valor:moneda(d.desc27), color:'ambar',
                  pie:'No es margen ganado',
                  insignia:`${porc(d.desc27, d.descFlete)} del desc. flete` })
      /* Causaciones: los conceptos que el ERP le carga al manifiesto
         (DXA, DDV, DDA, DDB, DXB, DA5, DMA). El valor es del manifiesto y
         viene repartido entre sus lineas, asi que la suma no lo repite
         aunque el manifiesto traiga varias remesas. */
      + tarjeta({ rotulo:'Causaciones', valor:moneda(d.causacion), color:'ambar',
                  pie:'Causado al manifiesto',
                  /* Sin la palabra "manifiestos": el pie ya la dice, y con
                     ella la pastilla no cabe y parte el renglon en dos. */
                  insignia: d.manifiestos
                    ? `${nf.format(d.manifConCausacion)} de ${nf.format(d.manifiestos)}`
                    : '' })
      /* Anticipos cargados al manifiesto. No es un costo aparte -- salen
         del mismo flete -- asi que no tocan la utilidad; lo que dicen es
         cuanto del flete se fue en anticipos. */
      + tarjeta({ rotulo:'Anticipos', valor:moneda(d.anticipos), color:'rojo',
                  pie:'Cargados al manifiesto',
                  /* Se mide contra el flete ANTES de descuentos, que es
                     sobre lo que se giran los anticipos, no contra el neto. */
                  insignia: fleteBruto
                    ? `${porc(d.anticipos, fleteBruto)} del flete`
                    : '' });
  } catch (e) {
    if (e.name === 'AbortError') return;
    cont.innerHTML = `<div class="col-12"><div class="alert alert-warning py-2 mb-0">`
      + `No se pudieron calcular los descuentos: ${esc(e.message)}</div></div>`;
  }
}

/* =====================================================================
   Cumplimiento por agencia

   Lo mismo que la hoja "Presupuesto" del BI, pero con lo real y la meta
   en la misma fila. La meta del libro es MENSUAL: el servicio la lleva al
   rango consultado y devuelve cuantos meses cubre, que es lo que se
   anuncia junto al titulo. Sin decirlo, una meta escalada parece inventada.
   ===================================================================== */
const ton = n => nf.format(Math.round(Number(n) || 0));
/* Importes en millones. A nivel de agencia el peso suelto es ruido, y en
   pesos completos los numeros no caben con el porcentaje en grande. El
   dato exacto sigue estando en el titulo emergente de la celda. */
const mill = n => '$ ' + nf.format(Math.round((Number(n) || 0) / 1000000)) + ' M';

/* Color del cumplimiento. Los cortes son los de siempre en presupuesto:
   por debajo de 85 hay problema, de 85 a 99 se va acercando, 100 o mas
   esta cumplido. No es un semaforo decorativo -- es lo primero que se lee
   en toda la tabla. */
function nivelCumplimiento(p) {
  if (p === null || !Number.isFinite(p)) return '';
  if (p >= 1)    return 'cumple';
  if (p >= 0.85) return 'cerca';
  return 'falla';
}

/* Una celda de la matriz: el porcentaje manda y el detalle va debajo.

   El rotulo viaja en data-rotulo y no se ve en pantalla ancha -- ahi lo
   dice el encabezado de la columna. En telefono, donde cada fila se
   convierte en una tarjeta y el encabezado desaparece, ese atributo es lo
   que nombra cada cifra. */
function celdaCumplimiento(real, meta, formato, exacto, rotulo) {
  const rot = ` data-rotulo="${esc(rotulo || '')}"`;
  if (meta === null || meta === undefined || !meta) {
    /* Sin meta no hay porcentaje. Un guion dice "no aplica"; un 0% diria
       que la agencia fallo, que es una acusacion distinta. */
    return `<td class="mz sin-meta"${rot}><b>—</b>`
         + `<span>${formato(real)} <em>sin meta</em></span></td>`;
  }
  const p = real / meta;
  const pc = (p * 100).toLocaleString('es-CO', { maximumFractionDigits: 0 }) + '%';
  return `<td class="mz ${nivelCumplimiento(p)}"${rot} title="${esc(exacto(real))} de ${esc(exacto(meta))}">`
       + `<b>${pc}</b><span>${formato(real)} <em>de ${formato(meta)}</em></span></td>`;
}

async function cargarAgencias(senal) {
  const cuerpo = $('#cuerpoAgencias'), nota = $('#notaAgencias'), pie = $('#pieAgencias');
  if (!cuerpo) return;
  cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Calculando…</td></tr>';
  if (nota) nota.textContent = '';
  try {
    const r = await fetch('/api/rebate/agencias?' + parametros(), { signal: senal });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));

    const meses = Number(d.meses) || 0;
    if (nota) nota.textContent = meses
      ? `meta mensual × ${meses.toLocaleString('es-CO', { maximumFractionDigits: 2 })} `
        + `${meses === 1 ? 'mes' : 'meses'} del rango`
      : 'sin rango de fechas, no hay meta contra que medir';

    const tot = { toneladas:0, ventas:0, utilidad:0, manifiestos:0,
                  mt:0, mv:0, mu:0, conMeta:false };
    for (const f of d.filas) {
      tot.toneladas += f.toneladas; tot.ventas += f.ventas;
      tot.utilidad  += f.utilidad;  tot.manifiestos += f.manifiestos;
      if (f.meta) {
        tot.conMeta = true;
        tot.mt += f.meta.toneladas; tot.mv += f.meta.ventas; tot.mu += f.meta.utilidad;
      }
    }

    const fila = (f, esTotal) => {
      /* Utilidad por tonelada: se calcula, no se suma. En el total tiene
         que salir de los totales, no del promedio de las agencias -- y su
         meta tampoco es el promedio de las nueve metas sino la meta de
         utilidad total dividida por la meta de toneladas, que es lo que
         de verdad se presupuesto por tonelada. */
      const utPorTon = f.toneladas ? f.utilidad / f.toneladas : null;
      const metaUt = esTotal
        ? (tot.mt ? tot.mu / tot.mt : null)
        : (f.meta ? f.meta.utilidadTon : null);
      return `<tr${esTotal ? ' class="total"' : ''}>`
        + `<td class="ag">${esc(f.agencia)}`
        + `<span class="sub">${nf.format(f.manifiestos)} manifiestos</span></td>`
        + celdaCumplimiento(f.toneladas, esTotal ? (tot.conMeta ? tot.mt : 0) : (f.meta && f.meta.toneladas), ton,   ton,    'Toneladas')
        + celdaCumplimiento(f.ventas,    esTotal ? (tot.conMeta ? tot.mv : 0) : (f.meta && f.meta.ventas),    mill, moneda, 'Ventas')
        + celdaCumplimiento(f.utilidad,  esTotal ? (tot.conMeta ? tot.mu : 0) : (f.meta && f.meta.utilidad),  mill, moneda, 'Utilidad')
        /* La cuarta columna con el mismo tratamiento que las otras tres:
           el porcentaje manda y el detalle va debajo. Asi la tabla se lee
           de corrido y no hay una columna que se comporte distinto.
           Sin toneladas no hay razon que calcular, y ahi si va el guion. */
        + (utPorTon === null
            ? '<td class="mz sin-meta" data-rotulo="Utilidad por tonelada">'
              + '<b>—</b><span>sin toneladas</span></td>'
            : celdaCumplimiento(utPorTon, metaUt, moneda, moneda, 'Utilidad por tonelada'))
        + `</tr>`;
    };

    cuerpo.innerHTML = d.filas.map(f => fila(f, false)).join('')
      + fila({ agencia:'TOTAL', ...tot }, true);

    if (pie) {
      /* Si algo quedo fuera de la tabla hay que decirlo aqui. Un total que
         no cuadra con el resto del informe y no explica por que es un
         total en el que nadie vuelve a confiar. */
      const fuera = Array.isArray(d.fuera) ? d.fuera : [];
      const aviso = fuera.length
        ? `No se incluye${fuera.length > 1 ? 'n' : ''} `
          + fuera.map(x => `${x.agencia} (${ton(x.toneladas)} t)`).join(', ')
          + `: sin presupuesto asignado, no hay contra qué medir${fuera.length > 1 ? 'las' : 'la'}. `
        : '';
      pie.textContent = aviso
        + 'Toneladas = peso facturado. Ventas = valor facturado menos el descuento de factura, '
        + 'en millones. Utilidad = utilidad real, la misma que el BI llama UtilPresupuesto. '
        + 'Pase el mouse sobre una celda para ver la cifra exacta en pesos. '
        + `Calculado en ${d.ms} ms.`;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
    cuerpo.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">`
      + `No se pudo calcular el cumplimiento: ${esc(e.message)}</td></tr>`;
    if (pie) pie.textContent = '';
  }
}

/* =====================================================================
   Panel de analisis · Viajes por cliente

   Barras horizontales y no de columnas: los nombres de los clientes son
   largos ("PRODUCTORA DE ALIMENTOS CONCENTRADOS PARA ANIMALES CONTEGRAL
   SAS") y en vertical habria que inclinarlos o cortarlos. Ordenadas de
   mayor a menor, que es lo que se viene a mirar: quien mueve mas.

   Una sola serie, un solo color. El valor va escrito al final de cada
   barra porque son quince, no una linea de tiempo con cien puntos: aqui
   la cifra exacta se necesita y no estorba.

   Se consulta cuando se abre el panel, no en cada busqueda. Si el panel
   esta abierto y cambian los filtros, se vuelve a pedir; si esta cerrado,
   queda marcado como vencido y se pide al abrirlo.
   ===================================================================== */
const TOPE_GRAFICO = 15;
let viajesVencido = true;      // hay que volver a pedir
let viajesPidiendo = null;     // consulta en vuelo

function pintarViajes(d) {
  const cont = $('#graficoViajes'), nota = $('#notaViajes');
  const filas = (d.filas || []).filter(f => f.viajes > 0);
  if (!filas.length) {
    cont.innerHTML = '<p class="gr-vacio">No hay viajes en lo que está filtrado.</p>';
    if (nota) nota.textContent = '';
    return;
  }
  const total = filas.reduce((a, f) => a + f.viajes, 0);
  const top   = filas.slice(0, TOPE_GRAFICO);
  const resto = filas.slice(TOPE_GRAFICO);
  /* La escala se fija con el mayor, no con el total: si no, con un cliente
     que se lleva el 30% las demas barras quedan invisibles. */
  const tope  = top[0].viajes;

  const barra = (rot, viajes, extra, esOtros) => {
    const p = tope ? (viajes / tope) * 100 : 0;
    const share = total ? ((viajes / total) * 100).toLocaleString('es-CO',
                    { maximumFractionDigits: 1 }) + '%' : '';
    return `<div class="gr-fila${esOtros ? ' otros' : ''}" title="${esc(rot)}: `
         + `${nf.format(viajes)} viajes · ${share} del total${extra ? ' · ' + esc(extra) : ''}">`
         + `<div class="gr-nom">${esc(rot)}</div>`
         + `<div class="gr-pista"><i style="width:${p.toFixed(2)}%"></i></div>`
         + `<div class="gr-val">${nf.format(viajes)}<span class="gr-pc">${share}</span></div>`
         + `</div>`;
  };

  cont.innerHTML =
      top.map(f => barra(f.cliente, f.viajes, `${nf.format(f.remesas)} remesas`, false)).join('')
    + (resto.length
        ? barra(`Otros ${nf.format(resto.length)} clientes`,
                resto.reduce((a, f) => a + f.viajes, 0), '', true)
        : '');

  if (nota) nota.textContent =
    `${nf.format(total)} viajes · ${nf.format(filas.length)} clientes`
    + (resto.length ? ` · se muestran los ${TOPE_GRAFICO} primeros` : '')
    + ` · ${d.ms} ms`;
}

async function cargarViajesCliente() {
  const panel = $('#panelAnalisis'), cont = $('#graficoViajes');
  if (!panel || !cont || !panel.open) return;
  if (viajesPidiendo) viajesPidiendo.abort();
  viajesPidiendo = new AbortController();
  const senal = viajesPidiendo.signal;
  cont.innerHTML = '<p class="gr-vacio">Calculando…</p>';
  try {
    const r = await fetch('/api/rebate/viajes-cliente?' + parametros(), { signal: senal });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
    viajesVencido = false;
    pintarViajes(d);
  } catch (e) {
    if (e.name === 'AbortError') return;
    /* Queda vencido a proposito: si fallo, al volver a abrir hay que
       reintentar y no dejar el error puesto para siempre. */
    viajesVencido = true;
    cont.innerHTML = `<p class="gr-vacio error">No se pudo calcular: ${esc(e.message)}</p>`;
    const nota = $('#notaViajes'); if (nota) nota.textContent = '';
  }
}

if ($('#panelAnalisis')) {
  $('#panelAnalisis').addEventListener('toggle', () => {
    if ($('#panelAnalisis').open && viajesVencido) cargarViajesCliente();
  });
}

async function cargar() {
  /* Una consulta a la vez: si llegan dos, la vieja se cancela. Sin esto
     una respuesta lenta puede pisar a una mas nueva y dejar en pantalla
     un resultado que ya no corresponde a los filtros. */
  if (peticion) peticion.abort();
  peticion = new AbortController();
  const senal = peticion.signal;

  cargarKpis(senal);
  cargarKpisDescuentos(senal);
  cargarAgencias(senal);
  /* El grafico se marca vencido en cada consulta. Si el panel esta abierto
     se vuelve a pedir de una; si esta cerrado, espera a que lo abran. */
  viajesVencido = true;
  if ($('#panelAnalisis') && $('#panelAnalisis').open) cargarViajesCliente();
  const cuerpo = $('#cuerpo');
  cuerpo.innerHTML = '<tr><td colspan="47" class="text-center text-muted py-5">Consultando…</td></tr>';
  try {
    const r = await fetch('/api/rebate?' + parametros(), { signal: senal });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));

    document.querySelectorAll('.tabla-rebate th.orden').forEach(th => {
      th.classList.toggle('activa', th.dataset.orden === d.orden);
      const fl = th.querySelector('.flecha');
      if (fl) fl.textContent = th.dataset.orden === d.orden ? (d.dir === 'desc' ? ' ↓' : ' ↑') : '';
    });

    /* El titulo del panel plegado dice cuantas filas hay. Sin eso, abrir
       la tabla es a ciegas: no se sabe si trae tres filas o veinte mil. */
    const ct = $('#contadorTabla');
    if (ct) ct.textContent = d.total
      ? `${nf.format(d.total)} ${d.total === 1 ? 'línea' : 'líneas'} · detalle de cada remesa`
      : 'sin líneas para lo que está filtrado';

    $('#meta').innerHTML =
      `${nf.format(d.total)} filas · página ${d.pagina} de ${d.paginas || 1} · ${d.ms} ms` +
      (d.modo === 'completo'
        ? ' · <span class="modo-completo" title="Filtrar por % de descuento u ordenar por una columna calculada obliga a recorrer todo el periodo en vez de solo la página. Por eso tarda más.">recorrido completo</span>'
        : '');

    if (!d.filas.length) {
      cuerpo.innerHTML = '<tr><td colspan="47" class="text-center text-muted py-5">'
                       + 'No hay líneas con estos filtros</td></tr>';
      $('#paginacion').innerHTML = ''; return;
    }

    /* Corte visual cuando cambia el cliente respecto de la fila anterior.
       Se calcula sobre la pagina que se esta pintando: la primera fila
       nunca lleva corte, porque arriba esta el encabezado. */
    let clienteAnterior = null;
    cuerpo.innerHTML = d.filas.map((f, i) => {
      const corte = i > 0 && f.NitCliente !== clienteAnterior;
      clienteAnterior = f.NitCliente;
      const clases = [seleccionadas.has(`${f.NumManif}-${f.NumOrden}-${f.Item}`) ? 'fila-sel' : '',
                      corte ? 'corte-cliente' : ''].filter(Boolean).join(' ');
      return `<tr data-fila="${f.NumManif}-${f.NumOrden}-${f.Item}"${clases ? ` class="${clases}"` : ''}>
      <td>${esc(f.Agencia)}</td>
      <td>${esc(f.IdCia)}</td>
      <td>${fecha(f.Fecha)}</td>
      <td>${f.NumManif}</td>
      <td>${f.NumOrden}</td>
      <td>${f.Item}${Number(f.FacturasDeRemesa) > 1
          ? `<span class="marca-split" title="Los ítems de esta remesa salieron en ${f.FacturasDeRemesa} facturas distintas.">◧</span>` : ''}</td>
      <td>${esc(f.IdVehiculo)}</td>
      <td>${esc(f.NitCliente)}</td>
      <td>${esc(f.NombreCliente)}</td>
      <td>${esc(f.IdentificacionPoseedor)}</td>
      <td>${esc(f.Poseedor)}</td>
      <td>${esc(f.NombreConductor)}</td>
      <td>${esc(f.TelMovilConductor)}</td>
      <td><span class="${f.AFILIADO === 'SI' ? 'pill-si' : 'pill-no'}" title="Afiliado según el listado de vehículos afiliados, no según la marca del ERP.">${esc(f.AFILIADO)}</span></td>
      <td>${esc(f.TipoAfiVehic)}</td>
      <td>${esc(f.MunicipioOrigen)}</td>
      <td>${esc(f.MunicipioDestino)}</td>
      <td class="num">${nf.format(f.TarifClie)}</td>
      <td class="num">${nf.format(f.TarifPago)}</td>
      <td class="num">${nf.format(f.PesoFinalMenor)}</td>
      <td class="num">${nf.format(f.TarifaFactura)}</td>
      <td>${fecha(f.FechaFacturacion)}</td>
      <td>${f.NumeroFactura ? esc(f.NumeroFactura) : '<span class="text-muted">sin facturar</span>'}</td>
      <td class="num">${nf.format(f.PesoFacturaKg)}</td>
      <td class="num">${cop(f.ValorFactura)}</td>
      ${f.DescuentoFactura === null && f.ReglaTipoCalculo === 'FIJO'
          ? `<td class="num celda-nd" title="${esc(f.ReglaFactura)}: es un valor fijo por manifiesto. Va en la primera línea del manifiesto y esta línea no lleva valor propio.">—</td>`
          : f.ReglaFactura
            ? `<td class="num" title="Condición aplicada: ${esc(f.ReglaFactura)} (${esc(f.ReglaTipoCalculo)})">${cop(f.DescuentoFactura)}</td>`
            : `<td class="num sin-regla" title="Ninguna condición de factura aplica a esta línea.">${cop(0)}</td>`}
      <td class="num final">${cop(f.ValorFinal)}</td>
      <td class="num">${f.Cumplido}</td>
      <td>${fecha(f.FechaCump)}</td>
      <td class="num">${nf.format(f.PesoCargue)}</td>
      <td class="num">${nf.format(f.PesoDescargue)}</td>
      ${f.Faltante === null || f.Faltante === undefined
          ? '<td class="num celda-nd" title="No hay cumplido con los dos pesos, no se puede calcular.">—</td>'
          : `<td class="num ${f.Faltante > 0 ? 'hay-faltante' : f.Faltante < 0 ? 'hay-sobrante' : ''}"${
              f.Faltante < 0 ? ' title="Descargó más de lo que cargó: es un sobrante."' : ''
            }>${nf.format(f.Faltante)}</td>`}
      <td><span class="${f.ODP === 'SI' ? 'pill-si' : 'pill-no'}">${f.ODP}</span></td>
      <td>${fecha(f.FechaOrdenPago)}</td>
      <td class="num">${nf.format(f.TarifaPagoODP)}</td>
      <td class="num">${ent(f.PesoODP)}</td>
      <td class="num"${Number(f.CantLineasManif) > 1
          ? ` title="El flete del manifiesto ${f.NumManif} repartido entre sus ${f.CantLineasManif} líneas."` : ''}>${cop(f.VrPagoFletes)}</td>
      ${f.ReglaFlete
          ? `<td class="num" title="Condición aplicada: ${esc(f.ReglaFlete)} (${esc(f.ReglaFleteTipo)})${f.PoseedorPreferencial ? ' · tarifa preferencial de poseedor' : ''}">${cop(f.DescuentoFlete)}</td>`
          : `<td class="num sin-regla" title="Ninguna condición de flete aplica a esta línea.">${cop(0)}</td>`}
      <td class="num final">${cop(f.FleteFinal)}</td>
      <td class="num${f.AjusteBonoTipo ? ' bono-ajustado' : ''}"${f.AjusteBonoTipo
          ? ` title="Ajuste manual del manifiesto ${f.NumManif}: ${esc(f.AjusteBonoTipo)} ${cop(f.AjusteBonoValor)}. Documento soporte: ${cop(f.DocSoporte)}."`
          : (Number(f.DocSoporte) ? ` title="Documento soporte del manifiesto ${f.NumManif}: ${cop(f.DocSoporte)}, repartido entre sus líneas."` : '')
        }>${Number(f.BonoxRemesa) ? cop(f.BonoxRemesa) : '<span class="text-muted">0</span>'}</td>
      <td class="num${f.AjusteCausacionTipo ? ' bono-ajustado' : ''}"${f.AjusteCausacionTipo
          ? ` title="Ajuste manual del manifiesto ${f.NumManif}: ${esc(f.AjusteCausacionTipo)}. El ERP no trae causación para este manifiesto."`
          : (Number(f.CausacionManifiesto) ? ` title="Causación del manifiesto ${f.NumManif}: ${cop(f.CausacionManifiesto)}, repartida entre sus líneas."` : '')
        }>${Number(f.CausacionPorRemesa) ? cop(f.CausacionPorRemesa) : '<span class="text-muted">0</span>'}</td>
      <td class="num"${Number(f.CargYDescManifiesto)
          ? ` title="Cargue y descargue del manifiesto ${f.NumManif}: ${cop(f.CargYDescManifiesto)}, repartido entre sus líneas."` : ''
        }>${Number(f.CargYDescxRemesa) ? cop(f.CargYDescxRemesa) : '<span class="text-muted">0</span>'}</td>
      <td class="num final">${cop(f.Utilidad)}</td>
      <td class="num final${enBanda27(f) ? ' util-real' : ''}"${enBanda27(f)
          ? ` title="Se devolvió el descuento general de flete (${(Number(f.TasaDescuentoFlete)*100).toLocaleString('es-CO',{maximumFractionDigits:1})}%, ${cop(f.DescuentoFlete)}): no cuenta como margen."`
          : ''}>${cop(f.UtilidadReal)}</td>
      <td class="num" title="Utilidad contra el flete que conserva el 2,7%, sobre el valor final facturado.">${pct(f.PctUtilPresupuesto)}</td>
      <td class="num" title="Utilidad neta (menos cargue/descargue y bono) devolviendo el 2,7%, sobre el valor facturado.">${pct(f.PctUtilidadSin27)}</td>
      <td class="num" title="Utilidad neta (menos cargue/descargue y bono) contando el 2,7% como margen, sobre el valor facturado.">${pct(f.PctUtilidadCon27)}</td>
    </tr>`;
    }).join('');

    const total = d.paginas || 1, act = d.pagina;
    const ir = (n, txt, activo, off) =>
      `<li class="page-item ${activo?'active':''} ${off?'disabled':''}">
         <a class="page-link" href="#" data-p="${n}">${txt}</a></li>`;
    let h = ir(act-1, '‹', false, act<=1);
    const desde = Math.max(1, act-2), hasta = Math.min(total, act+2);
    if (desde > 1) h += ir(1, '1', act===1, false) + (desde > 2 ? ir(0,'…',false,true) : '');
    for (let n = desde; n <= hasta; n++) h += ir(n, n, n===act, false);
    if (hasta < total) h += (hasta < total-1 ? ir(0,'…',false,true) : '') + ir(total, total, act===total, false);
    h += ir(act+1, '›', false, act>=total);
    $('#paginacion').innerHTML = h;
  } catch (e) {
    if (e.name === 'AbortError') return;
    cuerpo.innerHTML = `<tr><td colspan="47" class="text-center text-danger py-5">Error: ${esc(e.message)}</td></tr>`;
    $('#paginacion').innerHTML = '';
  }
}

/* =====================================================================
   Los filtros se aplican solos.

   No hay que picar Consultar: cambiar un desplegable o una fecha consulta
   al momento, y en los campos de texto se espera a que el usuario deje de
   escribir. Dos precauciones que no sobran:

     - se compara la firma de los filtros contra la ultima aplicada, asi
       que abrir un desplegable y volver a escoger lo mismo no consulta;
     - solo hay una consulta viva: si llega otra, la anterior se cancela.
       Sin eso una respuesta lenta puede pisar a una mas nueva.
   ===================================================================== */
const ESPERA_MS = 500;
let temporizador = null;
let firmaFiltros = null;

const firmaActual = () => new URLSearchParams(new FormData($('#filtros'))).toString();

function aplicarFiltros(forzar) {
  clearTimeout(temporizador);
  actualizarChips();
  const f = firmaActual();
  if (!forzar && f === firmaFiltros) return;
  firmaFiltros = f;
  seleccionadas.clear();
  paginaActual = 1;
  cargar();
}

/* =====================================================================
   Estado visible de los filtros.

   Trece de los dieciseis viven en un panel que casi siempre esta cerrado.
   Si nada lo muestra, es cuestion de dias que alguien mire un informe
   filtrado creyendo que ve el total. Por eso hay dos cosas:

     - un contador en el boton, para saber que hay algo puesto sin abrir;
     - un chip por cada filtro activo, con su valor y una x para quitarlo.

   El rango de fechas no lleva chip: siempre esta puesto y siempre se ve.
   ===================================================================== */
/* Los que viven dentro del panel. Manifiesto salio de aqui: esta a la
   vista en la barra, y contarlo en la insignia haria creer que hay un
   filtro escondido cuando no lo hay. */
const EN_PANEL = ['idCia','origen','destino','afiliado',
                  'flota','odp','cumplido','facturado','tasaMinPct','tasaMaxPct'];

const ETIQUETA = {
  cliente:'Cliente', agencia:'Agencia', idCia:'Cía', manif:'Manifiesto',
  origen:'Origen', destino:'Destino', placa:'Placa', afiliado:'Afiliado',
  flota:'Flota', odp:'ODP', cumplido:'Cumplido', facturado:'Facturado',
  tasaMinPct:'% desc. desde', tasaMaxPct:'% desc. hasta'
};

/* SI/NO se leen mejor en minuscula dentro de una frase corta. */
const VALOR_CHIP = { SI:'sí', NO:'no' };

function campos() {
  return [...$('#filtros').elements].filter(e => e.name && ETIQUETA[e.name]);
}

function actualizarChips() {
  const activos = campos().filter(e => e.value !== '');
  const cont = $('#chipsFiltros');
  cont.innerHTML = activos.map(e => {
    const v = VALOR_CHIP[e.value] || e.value;
    /* Rotulo y valor con pesos distintos: el ojo va al valor, que es lo
       que cambia; el rotulo solo dice de que campo es. */
    return `<span class="chip-filtro" data-campo="${e.name}"`
         + ` title="${esc(ETIQUETA[e.name])}: ${esc(v)}">`
         + `<span class="et">${esc(ETIQUETA[e.name])}</span>`
         + `<span class="vl">${esc(v)}</span>`
         + `<button type="button" class="x" aria-label="Quitar el filtro de ${esc(ETIQUETA[e.name])}">`
         + `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"`
         + ` stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`
         + `</button></span>`;
  }).join('');

  const enPanel = activos.filter(e => EN_PANEL.includes(e.name)).length;
  const c = $('#contadorFiltros');
  c.textContent = enPanel || '';
  c.classList.toggle('hay', !!enPanel);
  $('#btnLimpiar').classList.toggle('d-none', !activos.length);
  $('#rotuloChips').hidden = !activos.length;
}

$('#chipsFiltros').addEventListener('click', ev => {
  const b = ev.target.closest('button.x'); if (!b) return;
  const nombre = b.closest('.chip-filtro').dataset.campo;
  const campo = campos().find(e => e.name === nombre);
  if (!campo) return;
  campo.value = '';
  aplicarFiltros();
});

$('#filtros').addEventListener('change', () => aplicarFiltros());
$('#filtros').addEventListener('input', ev => {
  /* Los desplegables ya avisan con 'change'; aqui solo interesan los
     campos donde se escribe, para no consultar en cada tecla. */
  if (ev.target.tagName === 'SELECT') return;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => aplicarFiltros(), ESPERA_MS);
});
$('#filtros').addEventListener('submit', e => { e.preventDefault(); aplicarFiltros(true); });
const limpiarTodo = () => { $('#filtros').reset(); aplicarFiltros(true); };
$('#btnLimpiar').onclick = limpiarTodo;
/* El mismo botón dentro del panel: quien está ahí no ve el de la barra. */
const btnLimpiarPanel = $('#btnLimpiarPanel');
if (btnLimpiarPanel) btnLimpiarPanel.onclick = limpiarTodo;

const iso = d => d.toISOString().slice(0, 10);
document.querySelectorAll('[data-rango]').forEach(b => b.onclick = () => {
  const f = $('#filtros'), hoy = new Date();
  if (b.dataset.rango === 'mes') {
    f.desde.value = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    f.hasta.value = iso(hoy);
  } else if (b.dataset.rango === 'anterior') {
    f.desde.value = iso(new Date(hoy.getFullYear(), hoy.getMonth()-1, 1));
    f.hasta.value = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0));
  } else {
    f.desde.value = '2026-01-01';
    f.hasta.value = iso(hoy);
  }
  marcarPastilla(b);
  aplicarFiltros(true);
});

/* La pastilla activa se marca al pulsarla, y se apaga si despues se toca
   una fecha a mano: ahi el rango ya no es el del boton. */
function marcarPastilla(b) {
  document.querySelectorAll('[data-rango]').forEach(x => x.classList.toggle('on', x === b));
}
$('#filtros').addEventListener('input', ev => {
  if (ev.target.name === 'desde' || ev.target.name === 'hasta') marcarPastilla(null);
});

/* =====================================================================
   Seleccion de filas.

   Con 45 columnas hay que desplazarse mucho a la derecha, y a la vuelta
   uno ya no sabe en que renglon iba. Un clic marca la fila y la marca se
   mantiene: al paginar, al reordenar y al volver a consultar, porque lo
   que se guarda es la LLAVE de la linea (manifiesto-remesa-item) y no su
   posicion en la pantalla.

   Se limpia sola cuando cambian los filtros: seguir marcando lineas de
   un periodo que ya no se esta mirando confunde mas de lo que ayuda.
   ===================================================================== */
$('#cuerpo').addEventListener('click', ev => {
  /* Un clic sobre texto que se esta seleccionando con el mouse no debe
     marcar la fila: se estaria peleando con copiar y pegar. */
  if (String(window.getSelection())) return;
  const tr = ev.target.closest('tr[data-fila]');
  if (!tr) return;
  const k = tr.dataset.fila;
  if (seleccionadas.has(k)) { seleccionadas.delete(k); tr.classList.remove('fila-sel'); }
  else                      { seleccionadas.add(k);    tr.classList.add('fila-sel'); }
});

/* =====================================================================
   Descarga a Excel.

   Se baja con fetch y no con una simple navegacion a la URL, por dos
   razones: si el servidor falla, una navegacion deja al usuario mirando
   un JSON de error en una pestaña en blanco; y asi se puede bloquear el
   boton mientras el archivo se arma, que con miles de filas toma su
   tiempo y si no la gente pica tres veces.
   ===================================================================== */
$('#btnExcel').onclick = async ev => {
  const b = ev.currentTarget;
  const texto = b.textContent;
  b.disabled = true; b.textContent = 'Generando…';
  try {
    const p = parametros();
    p.delete('pagina'); p.delete('limite');   // se exporta todo, no la pagina
    const r = await fetch('/api/rebate/exportar?' + p);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      throw new Error((d && d.error) || ('HTTP ' + r.status));
    }
    const filas   = r.headers.get('X-Filas');
    const cortado = r.headers.get('X-Cortado') === '1';
    const blob = await r.blob();

    const nombre = (r.headers.get('Content-Disposition') || '')
      .match(/filename="([^"]+)"/)?.[1] || 'rebate.xlsx';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    /* Se libera despues: si se revoca de una, Firefox cancela la bajada. */
    setTimeout(() => URL.revokeObjectURL(url), 60000);

    $('#meta').innerHTML += ` · <span class="modo-completo">`
      + `${nf.format(Number(filas))} filas exportadas`
      + (cortado ? ' (se alcanzó el tope; acota los filtros para llevarlas todas)' : '')
      + '</span>';
  } catch (e) {
    alert('No se pudo exportar: ' + e.message);
  } finally {
    b.disabled = false; b.textContent = texto;
  }
};

$('#paginacion').addEventListener('click', ev => {
  const a = ev.target.closest('a[data-p]'); if (!a) return;
  ev.preventDefault();
  const n = +a.dataset.p; if (n < 1) return;
  paginaActual = n;
  cargar();
});

/* Clic en el titulo de una columna: primer clic ordena, segundo invierte. */
document.querySelector('.tabla-rebate thead').addEventListener('click', ev => {
  const th = ev.target.closest('th.orden');
  if (!th) return;
  const col = th.dataset.orden;
  if (ordenActual === col) {
    dirActual = dirActual === 'asc' ? 'desc' : 'asc';
  } else {
    ordenActual = col;
    // texto arranca A-Z; numeros y fechas arrancan de mayor a menor
    const numerica = th.classList.contains('num') || /^(Fecha|Num|Item|Cumplido|Pct)/.test(col);
    dirActual = numerica ? 'desc' : 'asc';
  }
  paginaActual = 1;
  cargar();
});

/* =====================================================================
   Aviso del listado de afiliados.

   Si la hoja de Drive deja de leerse, la plataforma NO se queda sin
   datos: sigue usando la ultima lista que alcanzo a cargar en
   Rebate_Afiliado. El problema es silencioso, y por eso hay que
   avisarlo: mientras la lista envejece, quien entro o salio del listado
   recibe el descuento equivocado.

   Dos niveles de ruido, a proposito:
     - el chip de la barra superior esta siempre, discreto
     - la franja solo aparece cuando hay algo que hacer
   ===================================================================== */
function pintarAvisoAfiliados(e) {
  const chip  = $('#chipAfiliados');
  const caja  = $('#avisoAfiliados');
  if (!chip || !caja) return;

  const activos = e.tabla && e.tabla.activos;
  const hace    = (e.tabla && e.tabla.hace) || 'sin fecha';
  /* En verde se muestra hace cuanto se VERIFICO la hoja, no hace cuanto
     entro la ultima carga: la hoja no cambia de noche, asi que un
     "hace 15 h" junto a un chip verde se lee como un problema cuando no
     lo hay. Lo que tranquiliza es saber que se esta mirando. */
  const visto = (e.ciclo && e.ciclo.latidoHace) || 'sin fecha';

  chip.className = 'chip-afiliados ' + e.nivel;
  chip.textContent = e.nivel === 'ok'
    ? `Afiliados: ${nf.format(activos || 0)} · revisado ${visto}`
    : `Afiliados: ${e.nivel === 'alerta' ? 'sin actualizar' : 'atrasado'} · ${hace}`;
  chip.title = e.nivel === 'ok'
    ? `${nf.format(activos || 0)} poseedores activos. Hoja revisada ${visto}. `
      + `Ultimo cambio cargado ${hace} (${e.tabla.origen || '-'}).`
    : (e.titulo || '') + (e.mensaje ? ' — ' + e.mensaje : '');

  if (e.nivel === 'ok') { caja.hidden = true; caja.innerHTML = ''; return; }

  caja.className = 'aviso-afiliados ' + e.nivel;
  caja.hidden = false;
  caja.innerHTML = `
    <div class="icono">${e.nivel === 'alerta' ? '&#9888;' : '&#9201;'}</div>
    <div>
      <div class="titulo">${esc(e.titulo || 'Problema con el listado de afiliados')}</div>
      <div class="texto">${esc(e.mensaje || '')}</div>
      ${e.detalleArchivo ? `<div class="tecnico">${esc(e.detalleArchivo)}</div>` : ''}
    </div>
    <div class="acciones">
      <button type="button" id="btnReintentarAfi" class="btn btn-sm btn-navy">Reintentar ahora</button>
    </div>`;

  $('#btnReintentarAfi').addEventListener('click', async ev => {
    const b = ev.currentTarget;
    b.disabled = true; b.textContent = 'Leyendo…';
    try {
      const r = await fetch('/api/afiliados/refrescar', { method: 'POST' });
      const d = await r.json();
      if (d.estado) pintarAvisoAfiliados(d.estado);
      /* Si la lista cambio, lo que hay en pantalla quedo calculado con la
         anterior. Se recarga para que nadie lea cifras de dos epocas. */
      if (d.resultado && d.resultado.ok &&
          (d.resultado.agregados || d.resultado.retirados)) cargar();
    } catch (err) {
      b.disabled = false; b.textContent = 'Reintentar ahora';
    }
  });
}

async function revisarAfiliados() {
  try {
    const r = await fetch('/api/afiliados/estado');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    pintarAvisoAfiliados(await r.json());
  } catch (e) {
    /* Si ni el estado responde, el servidor esta caido o reiniciando.
       No se borra el ultimo aviso: se marca que no se sabe. */
    const chip = $('#chipAfiliados');
    if (chip) { chip.className = 'chip-afiliados aviso'; chip.textContent = 'Afiliados: sin respuesta'; }
  }
}

revisarAfiliados();
setInterval(revisarAfiliados, 60000);

/* =====================================================================
   Desplegable de agencias.

   Se llena una vez al abrir y no se vuelve a tocar: la lista no depende
   de los filtros, asi que la agencia elegida no se cae sola cuando se
   mueve una fecha.

   Si la consulta falla se deja "Todas" y se dice por que en el propio
   desplegable. Un <select> vacio y mudo es peor que no tenerlo: parece
   que la empresa no tiene agencias.
   ===================================================================== */
async function cargarListaAgencias() {
  const sel = $('#selAgencia');
  if (!sel) return;
  const todas = sel.options[0];
  todas.textContent = 'Cargando…';
  try {
    const r = await fetch('/api/rebate/lista-agencias');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const elegida = sel.value;
    sel.insertAdjacentHTML('beforeend', (d.filas || [])
      /* El titulo dice cuanto pesa cada agencia y cuando planillo por
         ultima vez: sirve para notar de una que una agencia lleva meses
         quieta, sin tener que elegirla para descubrirlo. */
      .map(x => `<option value="${esc(x.agencia)}" title="${esc(x.agencia)}`
              + ` — ${nf.format(x.lineas || 0)} líneas`
              + `${x.ultima ? ', última planilla ' + esc(fechaCorta(x.ultima)) : ''}">`
              + `${esc(x.agencia)}</option>`)
      .join(''));
    todas.textContent = 'Todas';
    /* Si alguien alcanzo a elegir mientras cargaba, se respeta. */
    if (elegida) sel.value = elegida;
  } catch (e) {
    todas.textContent = 'Todas (lista no disponible)';
  }
}

cargarListaAgencias();

firmaFiltros = firmaActual();
actualizarChips();
cargar();

