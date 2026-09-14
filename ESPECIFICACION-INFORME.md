# Especificación del informe

Origen: `Escritorio/DASHBOARD_REBATE_FINAL.pbix` — **4-sep-2026**, formato PBIR.
Medidas verificadas contra el modelo vivo abierto en Power BI Desktop.

> Una versión anterior (`Documents/DASHBOARD_REBATE_FINAL_ajustar.pbix`, mayo)
> difiere: no usaba las columnas de descuento del SQL y la tabla principal
> tenía otras medidas. Esta especificación refleja la versión ACTUAL.

## Páginas

| Página | Visuales | Fuente |
|---|---|---|
| **Rebate** | 31 | tabla de 49 campos · 12 segmentadores · 12 tarjetas |
| **Clientes** | 4 | matriz por cliente (6 campos) |
| **Gerencial** | 23 | `Trn_Facturas`, `Trn_Recibos`, `Trn_TraOrdenPago`, `Trn_TraAnticipos`, `Trn_TraOrdenManif` — **no usa la vista** |
| **Presupuesto** | 7 | tabla por agencia + `Tabla_Base` + dona |
| **Flota PROPIA** | 11 | tabla por conductor + 4 tarjetas |

## Columnas de la vista que usa el informe

**Tabla principal (Rebate) — 32 columnas**

Agencia · IdCia · Fecha · NumManif · NumOrden · Item · IdVehiculo · NitCliente ·
NombreCliente · IdentificacionPoseedor · Poseedor · NombreConductor ·
TelMovilConductor · AFILIADO · TipoAfiVehic · MunicipioOrigen ·
MunicipioDestino · TarifClie · TarifPago · PesoFinalMenor · CantRemesas ·
TieneVariasRemesas · FechaFacturacion · NumeroFactura · ValorFactura ·
Cumplido · PesoCargue · PesoDescargue · ODP · FechaOrdenPago · TarifaPagoODP ·
FechaCump

**Otras páginas — 7 columnas más**

| Columna | Dónde |
|---|---|
| `PesoFacturaKg` | tarjetas Rebate y Flota Propia, matriz Clientes |
| `VrPagoFletes` | matriz Clientes, tabla Presupuesto, tabla Flota Propia |
| `ValorFacturaConDescuento` | **matriz Clientes** |
| `ValorFleteConDescuento` | **matriz Clientes** |
| `PesoFacturaToneladas` | tabla Presupuesto |
| `IdentificacionConductor` | tabla Flota Propia |
| `TarifaFactura` | la consumen varias medidas |

**Calculadas, en segmentadores (5)**

CumplidoTexto · FacturadaTexto · ManifTexto · GrupoAgencia · % descuento

**Solo las consumen las medidas (4)**

| Columna | Medidas |
|---|---|
| `ValorCausacion` | CausacionPorRemesa, FP_Cobro |
| `ValorTotalDocSoporte` | BonoxRemesa, Bono Ajustado, BonoxRemesa Ajustado |
| `VrConcPagos` | Utilidad_Real_Sin2.7, Utilidad_final_real_Con2.7, CargYDescxRemesa |
| `Tiene_Liquidacion` | Manifiestos_Sin_Liquidacion |

## Columnas muertas — ningún visual ni medida (11)

`PesoPlanillado` · `VrCreditoAnulados` · `VrNetoFactura` · `Referencia2` ·
`Anulado` · `EstadoManifiesto` · `Pago_Flete_Nuevo` · `TipoOperTra` ·
`Remesa_Base` · `DescuentoFactura` · `DescuentoFlete`

`VrCreditoAnulados` es lo único que consume la CTE `AuditoriaAnulados`, que
recorre `Trn_TraCauDetalle` sin filtro de fecha. Al eliminar la columna,
la CTE desaparece.

## ⚠ La página Clientes está mostrando cifras incorrectas

La matriz usa **`ValorFleteConDescuento`** directamente desde el SQL. Esa
columna tiene el bug del `ELSE` final: devuelve el descuento del 2,7% en lugar
del flete neto.

- 17.561 de 23.299 filas afectadas (75%)
- Suma actual ≈ 31.173 millones · debería ser ≈ 109.000 millones

**Corregir esos dos `ELSE` en la vista no es opcional.** Ver `NOTAS-TECNICAS.md`.
También aplica a `ValorFacturaConDescuento`, que usa una base distinta de
`ValorFactura` cuando `TarifaFactura = 0`.

## Medidas "Ajustado" en la tabla principal

La versión actual usa una familia de medidas que la de mayo no tenía:
`TarifaFacturaAjustada` · `Peso KG Ajustado` · `Peso ODP Ajustado` ·
`VrPagoFletes Ajustado` · `BIDescuentoFlete Ajustado` ·
`flete_con_descuento_final Ajustado` · `BonoxRemesa Ajustado`

La tabla de **Presupuesto** usa `ValorFacturaNueva` (medida), no la columna.

## Consultas del informe web

| Pantalla | Consulta |
|---|---|
| Listado Rebate | 32 columnas + `OFFSET/FETCH`; filtros fecha, cliente, agencia, ruta, ODP, vehículo, IdCia |
| Tarjetas KPI | agregados sobre el mismo filtro, sin traer filas |
| Detalle manifiesto | una remesa: añade causación, doc soporte y liquidación |
| Clientes | `GROUP BY NombreCliente` |
| Presupuesto | `GROUP BY Agencia` + `Tabla_Base` |
| Flota Propia | listado con `TipoAfiVehic = 'PROPIO'` |
| Gerencial | independiente de la vista — 5 tablas del ERP directas |
