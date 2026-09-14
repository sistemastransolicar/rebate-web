# Notas técnicas del entorno

## SQL Server

- **Versión:** SQL Server 2014 (12.0.2000.8)
- **Compatibilidad:** `dbsyscomTras` 120 · `dbpimagT` 110 · `master` 120
- **Servidor:** 127.0.0.1 (misma máquina)

### Qué se puede y qué no

| Se puede | No existe en 2014 |
|---|---|
| `OFFSET / FETCH NEXT` (paginación) | `STRING_AGG` (usar `FOR XML PATH`) |
| CTE, `ROW_NUMBER()`, `TRY_CONVERT` | `STRING_SPLIT` |
| `IIF`, `CONCAT`, `FORMAT` | `OPENJSON`, `JSON_VALUE` |
| `ALTER ROLE … ADD MEMBER` | `TRIM` (usar `LTRIM(RTRIM())`) |

El historial de reglas guarda JSON en `NVARCHAR(MAX)`, pero **lo parsea Node**,
no SQL Server. Por eso no hace falta soporte JSON en la base.

## Claves e índices del ERP

Patrón general: casi todas las PK empiezan por `TipDoc`. **Si el JOIN no
incluye `TipDoc`, la PK no sirve para búsqueda directa** y SQL Server recorre
la tabla. Es el error más frecuente en la vista actual.

| Tabla | Clave / índice útil |
|---|---|
| `Trn_TraRemesa` | PK (TipDoc, NumOrden, IdCia) · IX Fecha |
| `Trn_TraRemMcias` | PK (TipDoc, NumOrden, IdCia, Item) |
| `Trn_TraManifiesto` | PK (TipDoc, Manifiesto, IdCia) |
| `Trn_TraFacRemesas` | PK (TipDoc, Factura, IdCia, Item) · **IX (TipRem, Remesa, IdCiaRem, ItemRem)** |
| `Trn_Facturas` | PK (TipDoc, Factura, IdCia) |
| `Trn_TraCumRemesas` | IX (Remesa) · IX (TipRem, Remesa, IdCiaRem, ItemRem) |
| `Trn_TraCumplido` | PK (TipDoc, Cumplido, IdCia) · IX (Cumplido, IdCia) |
| `Trn_TraOrdenManif` | **IX (Manifiesto, IdCia, OrdPago)** |
| `Trn_TraOrdenPago` | IX (OrdPago, IdCia) |
| `Terceros` | PK (IdTercero) |

### Faltan (ver `sql/03_indices_recomendados_ERP.sql`)

- `Trn_TraCauDetalle` no tiene índice por `Referencia`
- `Trn_DocSoporte` no tiene índice por `NumFactura`
- `Trn_TraRemesa` no tiene índice por `NumManif`

Las tres se buscan así en la vista actual, y las tres hacen recorrido completo.

## Reglas para escribir las consultas

1. Incluir siempre `TipDoc` / `TipRem` en los JOIN.
2. Para facturación usar `IX_Trn_TraFacRemesasRemesa`: filtrar por
   `TipRem`, `Remesa`, `IdCiaRem`, `ItemRem` — cubre el índice entero.
   Ojo: el índice usa `IdCiaRem`, no `IdCia`.
3. Filtrar por `Fecha` con rango cerrado (`>= @desde AND < @hasta+1día`),
   nunca envolviendo la columna en una función.
4. `ROW_NUMBER()` en CTE en vez de `OUTER APPLY TOP 1` por fila.

---

## Segundo caso del bug de ItemRem: el cumplido

`vista_Rebate_Final` tiene el mismo defecto del `OUTER APPLY` de factura,
ahora en el bloque `cr` (cumplido):

```sql
OUTER APPLY (
    SELECT TOP 1 crx.*
    FROM Trn_TraCumRemesas crx
    INNER JOIN Trn_TraCumplido c ON crx.Cumplido = c.Cumplido
    WHERE crx.Remesa = r.NumOrden          -- ❌ sin correlacion por ItemRem
      AND ISNULL(c.Anulado, 0) = 0
    ORDER BY c.Cumplido DESC               -- ❌ empata: desempate arbitrario
) AS cr
```

`Trn_TraCumRemesas` guarda peso **por item**, y coincide con la factura:

| Remesa | ItemRem | PesoCargue | PesoNeto | Cantidad facturada |
|---|---|---|---|---|
| 414966 | 1 | 32.315 | 32.260 | 32.260 |
| 414966 | 2 | 100 | 100 | 100 |
| 414966 | 3 | 1.000 | 1.000 | 1.000 |
| 414966 | 4 | 25 | 80 | 80 |

Las 4 lineas comparten el mismo `Cumplido` (253920), asi que el `TOP 1`
no elige: recibe lo que el motor entregue primero. La vista devolvio el
item 1; la consulta nueva devolvia el item 4. **Ninguna de las dos es
determinista.**

Afecta `PesoFinalMenor`, `PesoCargue` y `PesoDescargue`, y por tanto
`ValorFactura` cuando `TarifaFactura = 0`, mas la medida `Faltante`.

**Alcance:** 35 remesas de 2026 con varias lineas de cumplido; 34 con
pesos distintos entre lineas.

**Correccion en la vista** — anadir al `WHERE` del `OUTER APPLY`:

```sql
      AND crx.ItemRem = rm.Item
```

Nota: la vista une `crx.Cumplido = c.Cumplido` sin `IdCia`. Se verifico
que en 2026 no hay ni una linea con `crx.IdCia <> c.IdCia` (0 de 23.120),
asi que agregar o no esa correlacion no cambia resultados hoy.

## Rendimiento del listado

Consulta `sql/consultas/03_listado_rebate.sql`, 50 filas, 36 columnas:

| Version | Tiempo |
|---|---|
| Primera version | 6,3 s |
| Conteo de remesas precalculado | 2,0 s |
| Uniones despues de paginar + conteo por pagina | **0,9 – 1,1 s** |

Descomposicion: **0,4 s son latencia de red** al servidor en AWS. El
trabajo real de la base es ~0,5-0,7 s.

Lo que hizo la diferencia:

1. El CTE `Base` solo une remesa + mercancia + manifiesto. Terceros y
   Municipios se unen **despues** de paginar, sobre 50 filas y no 23.000.
2. Los filtros de municipio usan `EXISTS`, para no unir la tabla cuando
   el filtro viene vacio.
3. Las busquedas caras (factura, cumplido, ODP) se resuelven solo sobre
   las filas de la pagina.

**Si la aplicacion se despliega en el mismo servidor de AWS**, se ahorran
los 0,4 s de latencia. Es la optimizacion mas barata que queda.

## La unidad de facturación es (Remesa, Item)

El ERP factura por línea, no por remesa: `Trn_TraFacRemesas` se correlaciona
por `Remesa` **y** `ItemRem`, y los ítems de una misma remesa pueden salir en
facturas distintas, con tarifas distintas.

Casos reales de 2026:

| Manifiesto | Remesa | Ítems | Facturas |
|---|---|---|---|
| 319276 | 415148 | 4 | 3 — 126834, 127535, 127535, 126805 |
| 317810 | 413655 | 4 | 2 intercaladas — ítems 1,3 → 126098; 2,4 → 126295 |
| 316653 | 412475 | 2 | 2 — 125597 y 125596, con tarifas $288 y $280 |

En 2026 hay 25 remesas con más de un ítem (64 líneas) y 3 de ellas quedaron
repartidas en varias facturas.

Consecuencias en el código:

- **KPI.** El indicador de facturación se mide en líneas
  (`SUM(Facturada)` sobre `Enriquecido`), no en remesas. El CTE `PorRemesa`
  clasifica cada remesa en *completa*, *parcial* o *sin facturar*.
  El indicador anterior —`COUNT(DISTINCT CASE WHEN Facturada=1 THEN NumOrden END)`—
  reportaba al 100 % una remesa a la que solo se le hubiera facturado un ítem.
  Verificación de integridad: completas + parciales + sin facturar = remesas.
- **Listado.** La columna `FacturasDeLaRemesa` cuenta las facturas distintas
  que cubren los ítems de la remesa. Solo se calcula cuando `CantItems > 1`
  (el `OUTER APPLY fr` lleva ese filtro adentro); en remesas de un solo ítem
  queda en 0 y el front no muestra nada. Cuando es > 1 la celda de factura
  lleva el distintivo `marca-split`.

Costo medido contra 2026 completo: KPIs 1,5 s → 1,8 s; listado rápido sin
cambio (~1,1 s); listado por columna derivada 2,9 s → 3,1 s.

## Columna «Desc. factura» en el listado

Sale de las condiciones de ámbito `FACTURA` guardadas en `dbRebate`, resueltas
en el mismo `SELECT` del listado con un `OUTER APPLY` contra
`dbRebate.dbo.Rebate_Regla` (`TOP 1 ... ORDER BY Prioridad, IdRegla`: primera
coincidencia gana, igual que `src/services/motorReglas.js` y que el `SWITCH`
del DAX). Cada comparación de texto lleva `COLLATE DATABASE_DEFAULT` por la
diferencia de intercalación entre las dos bases.

Se resolvió en SQL y no en Node para que la columna se pueda ordenar como
cualquier otra. **`motorReglas.js` queda como segunda implementación de la
misma semántica** — si se cambia una, hay que cambiar la otra.

### Cómo se reparte el descuento entre las líneas

| Tipo de cálculo | Base | Comportamiento en el listado |
|---|---|---|
| `POR_TONELADA` | peso de la línea | cada línea lleva lo suyo; la suma cuadra sola |
| `PORCENTAJE`   | valor de la línea | igual (hoy no hay ninguna regla de este tipo) |
| `FIJO`         | el manifiesto | va en la **primera línea del manifiesto**, `NULL` en las demás |

`FIJO` es un valor por manifiesto (10 de las 16 condiciones lo son), así que
repetirlo en cada línea multiplicaría el descuento. Se usa la misma convención
que el pago de fletes: valor en la primera línea, celda sombreada con `—` en
las demás. Sin condición aplicable el descuento es **0**, no `NULL`; así se
distingue «no aplica ninguna condición» de «el valor está en otra línea».

Único caso de 2026: manifiesto **317142**, remesa 412958, 2 ítems —
$364.000 en el ítem 1, `NULL` en el ítem 2.

### Verificación

Comparado el total de 2026 calculado por línea contra el mismo total calculado
por manifiesto (el método que ya se había cotejado contra el BI):

```
TotalPorLinea       1.280.695.930
TotalPorManifiesto  1.280.695.930
ManifQueDifieren    0
```

### Limitación conocida

La línea que recibe el `FIJO` es la primera del manifiesto. Si un manifiesto
llevara remesas de clientes o fechas distintas y solo las últimas casaran con
una condición, el descuento se perdería. En 2026 hay 14 manifiestos con ese
criterio mixto y **ninguno** casa con condición alguna, así que hoy no ocurre.

### Otros dos arreglos de paso

- `views/rebate.ejs` había perdido la etiqueta `<thead>` en una edición
  anterior (quedó un `<th>` suelto antes del `<tr>`) y por eso la columna
  Agencia no se podía ordenar. Corregido.
- El filtro por manifiesto usaba `f.manif ? ... : null`, de modo que el
  manifiesto **0** —el de las remesas huérfanas— se leía como «sin filtro» y
  devolvía las 23.736 filas. Corregido. (El listado sigue sin mostrar esas
  remesas: el `JOIN` con `Trn_TraManifiesto` las descarta porque el
  manifiesto 0 no existe. Son 25 en 2026.)

## Columna «Valor final»

`ValorFinal = ValorFactura - ISNULL(DescuentoFactura, 0)`.

El `ISNULL` importa: en las líneas donde el descuento es `NULL` (porque el
`FIJO` vive en la primera línea del manifiesto) no se resta nada. El valor
facturado de esa línea es real; lo que está en otro renglón es el descuento.
Si se restara `NULL` la línea entera quedaría en `NULL`.

Las tres expresiones que se usan en más de una columna —peso de factura,
valor de factura y descuento— se arman una sola vez en las constantes
`EX_PESO_FACTURA`, `EX_VALOR_FACTURA` y `EX_DESCUENTO` de
`rebate.repo.js`, porque SQL no deja referenciar el alias de otra columna del
mismo `SELECT` y copiar el texto era pedir que una copia se quedara atrás.

Verificado sobre 2.000 filas (ordenadas por valor, por descuento, por valor
final y por el orden por defecto): 0 restas mal. Sin costo medible — listado
rápido ~1,1 s, ordenado por columna derivada ~3,0 s.

## "Afiliado" no es la marca del ERP

La medida `BIDescuentoFlete` **no** usa la columna `AFILIADO` (que sale de
`Terceros.Fax = '1'`). Usa un listado que la operación mantiene aparte:

```dax
VAR EsAfiliado = CONTAINS ( 'Listado AF', 'Listado AF'[Id Poseedor], [IdentificacionPoseedor] )
```

Ese listado es `G:\Mi unidad\LISTADO VH AFILIADOS 2025.xlsx`, hoja `EDINSO`,
sincronizado por Drive y **editado en Google Sheets**. Las dos fuentes no
coinciden: sobre 2026, en 91 líneas el ERP dice afiliado y el listado no, y
en 2.427 al revés. Como el BI usa el listado, la plataforma también.

- `src/services/leerXlsx.js` — lector de .xlsx sin dependencias (un .xlsx es
  un ZIP y Node trae `zlib`). Solo lectura.
- `src/services/afiliados.js` — resuelve la ruta (con o sin extensión),
  ubica la columna `ID POSEEDOR`, normaliza y cachea por fecha de
  modificación. Si no puede leer, **devuelve error**: nunca "nadie es
  afiliado", porque eso bajaría los descuentos en silencio.
- `src/services/sincronizarAfiliados.js` — vuelca el listado a
  `Rebate_Afiliado`. Hace falta en SQL porque la columna se ordena y se
  filtra allí, y las condiciones de flete se resuelven allí.

### Tres trampas que costaron encontrar

1. **Celdas autocerradas.** `<c r="B3" s="1"/>` — el patrón que reconocía las
   celdas la tomaba como etiqueta de apertura y se tragaba todo hasta el
   siguiente `</c>`. La hoja está llena de ellas porque la columna sale de un
   `VLOOKUP`. Se leían 1.321 de 1.995 filas.
2. **Notación científica.** El exportador de Google Sheets escribe
   `<v>1.00237033E9</v>`. Leído como texto, el NIT `1002370330` se convertía
   en `100237033E9` — y de paso perdía el cero final. Ahora las celdas
   numéricas se pasan a entero plano.
3. **`#N/A`.** Celdas `t="e"` de fórmulas sin resultado. Se descartan.

### Verificación

| | plataforma | BI |
|---|---|---|
| Poseedores afiliados en los datos | 766 | 764 |
| Líneas afiliadas | 14.648 | 14.522 |
| ERP sí / lista sí | 12.221 | 12.103 |
| ERP sí / lista no | 91 | 178 |
| ERP no / lista sí | 2.427 | 2.419 |

La diferencia es de fechas, no de lectura: el BI cargó su copia del listado
hace semanas y el archivo se modificó el 3/09. Los 87 que bajaron en
"ERP sí / lista no" son poseedores que ya estaban marcados en el ERP y que
desde entonces se agregaron a la hoja. La plataforma los ve; el BI no, hasta
que se actualice.

### Salvaguarda

`sincronizarAfiliados` se niega a sincronizar si el listado cae por debajo
del 70 % de los poseedores activos anteriores. Es exactamente el error que
se cometió aquí: una lectura parcial (1.321 de 1.995 filas) habría dejado sin
descuento a media flota sin que nadie lo notara.
