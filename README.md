# Informe Rebate

Informe de descuentos y utilidad por manifiesto para Transolicar S.A.S.
Reemplaza el tablero de Power BI `DASHBOARD_REBATE_FINAL`: lee en vivo del
ERP Syscom y aplica las condiciones de descuento guardadas en su propia
base, sin pasos manuales ni actualizaciones programadas.

## Qué hace

- **Indicadores** del periodo: manifiestos, peso movilizado, facturación,
  pago de fletes, descuentos, utilidad real, causaciones y anticipos.
- **Tabla de detalle** línea por línea (47 columnas) con exportación a
  Excel de todo lo filtrado, no solo de la página en pantalla.
- **Cumplimiento por agencia** contra el presupuesto mensual, con semáforo.
- **Condiciones de descuento** administrables desde la propia aplicación,
  en una sección protegida por contraseña.

## Requisitos

- Node.js 18 o superior.
- Acceso de **solo lectura** a la base del ERP (`dbsyscomTras`) y de
  lectura/escritura a la base propia de reglas (`dbRebate`).

## Puesta en marcha

```bash
npm ci
cp .env.example .env    # y completar los valores
node src/app.js
```

Queda en `http://localhost:3050/rebate`.

## Configuración

Todo va en `.env`, que **no** está en el repositorio. `.env.example` lista
las variables con valores de muestra: conexión a SQL Server, nombres de
las dos bases, rango mínimo de fechas, ruta del listado de afiliados y la
clave de la sección de Condiciones.

## Estructura

```
src/config/         conexiones a SQL Server
src/repositories/   todo el SQL del informe
src/routes/         API HTTP
src/services/       presupuesto, columnas, escritura de Excel, acceso
public/             CSS y JavaScript de la pantalla
views/              plantillas EJS
```

## Notas

- Contra el ERP **solo se consulta**. Las escrituras van únicamente a la
  base propia de reglas.
- Los nombres de agencia del ERP vienen cortados a diez caracteres; la
  consulta los normaliza igual que lo hacía Power Query en el BI.
- El listado de poseedores afiliados no sale de la marca del ERP: sale de
  la tabla `Rebate_Afiliado`, que se alimenta de un Excel externo.

Uso interno de Transolicar S.A.S.
