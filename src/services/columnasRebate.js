'use strict';
/* Columnas del informe para la exportacion a Excel.

   Mismo orden que la tabla de la pantalla, para que quien exporta
   encuentre lo que estaba viendo. Al final van tres que la tabla no
   muestra pero que en Excel valen mucho: que condicion se aplico en
   factura y en flete, y con que tasa quedo el descuento. En pantalla eso
   vive en el tooltip, y un tooltip no se puede filtrar ni tabular.

   Sobre los tipos:
     identificador  numero SIN separador de miles: manifiesto, remesa,
                    item, cumplido, NIT, cedula, factura. Son numeros que
                    se comparan y se buscan, no cantidades que se leen.
     texto          solo lo que de verdad NO es numero. Ojo con dos:
                    - IdCia es '01' y '02': como numero perderia el cero
                      de adelante y quedaria 1 y 2.
                    - El telefono del conductor puede traer ceros al
                      inicio, varios numeros o separadores. Se deja texto
                      a proposito; convertirlo dañaria datos. */
module.exports = [
  { titulo: 'Agencia',           clave: 'Agencia',                tipo: 'texto',      ancho: 12 },
  { titulo: 'Cía',               clave: 'IdCia',                  tipo: 'texto',      ancho: 6 },
  { titulo: 'Fecha',             clave: 'Fecha',                  tipo: 'fecha',      ancho: 11 },
  { titulo: 'Manifiesto',        clave: 'NumManif',               tipo: 'identificador', ancho: 11 },
  { titulo: 'Remesa',            clave: 'NumOrden',               tipo: 'identificador', ancho: 11 },
  { titulo: 'Item',              clave: 'Item',                   tipo: 'identificador', ancho: 6 },
  { titulo: 'Vehículo',          clave: 'IdVehiculo',             tipo: 'texto',      ancho: 10 },
  { titulo: 'NIT cliente',       clave: 'NitCliente',             tipo: 'identificador', ancho: 13 },
  { titulo: 'Cliente',           clave: 'NombreCliente',          tipo: 'texto',      ancho: 34 },
  { titulo: 'Ident. poseedor',   clave: 'IdentificacionPoseedor', tipo: 'identificador', ancho: 14 },
  { titulo: 'Poseedor',          clave: 'Poseedor',               tipo: 'texto',      ancho: 30 },
  { titulo: 'Conductor',         clave: 'NombreConductor',        tipo: 'texto',      ancho: 28 },
  { titulo: 'Tel. conductor',    clave: 'TelMovilConductor',      tipo: 'texto',      ancho: 14 },
  { titulo: 'Afiliado',          clave: 'AFILIADO',               tipo: 'texto',      ancho: 9 },
  { titulo: 'Flota',             clave: 'TipoAfiVehic',           tipo: 'texto',      ancho: 11 },
  { titulo: 'Origen',            clave: 'MunicipioOrigen',        tipo: 'texto',      ancho: 20 },
  { titulo: 'Destino',           clave: 'MunicipioDestino',       tipo: 'texto',      ancho: 20 },
  { titulo: 'Tarif. cliente',    clave: 'TarifClie',              tipo: 'entero',     ancho: 13 },
  { titulo: 'Tarif. pago',       clave: 'TarifPago',              tipo: 'entero',     ancho: 13 },
  { titulo: 'Peso final',        clave: 'PesoFinalMenor',         tipo: 'entero',     ancho: 12 },
  { titulo: 'Tarifa factura',    clave: 'TarifaFactura',          tipo: 'decimal',    ancho: 13 },
  { titulo: 'Fec. factura',      clave: 'FechaFacturacion',       tipo: 'fecha',      ancho: 12 },
  { titulo: 'Factura',           clave: 'NumeroFactura',          tipo: 'identificador', ancho: 12 },
  { titulo: 'Peso factura',      clave: 'PesoFacturaKg',          tipo: 'entero',     ancho: 12 },
  { titulo: 'Valor factura',     clave: 'ValorFactura',           tipo: 'moneda',     ancho: 16 },
  { titulo: 'Desc. factura',     clave: 'DescuentoFactura',       tipo: 'moneda',     ancho: 15 },
  { titulo: 'Valor final',       clave: 'ValorFinal',             tipo: 'moneda',     ancho: 16 },
  { titulo: 'Cumplido',          clave: 'Cumplido',               tipo: 'identificador', ancho: 10 },
  { titulo: 'Fec. cumplido',     clave: 'FechaCump',              tipo: 'fecha',      ancho: 12 },
  { titulo: 'Cargue',            clave: 'PesoCargue',             tipo: 'entero',     ancho: 11 },
  { titulo: 'Descargue',         clave: 'PesoDescargue',          tipo: 'entero',     ancho: 11 },
  { titulo: 'Faltante',          clave: 'Faltante',               tipo: 'entero',     ancho: 10 },
  { titulo: 'ODP',               clave: 'ODP',                    tipo: 'texto',      ancho: 7 },
  { titulo: 'Fec. ODP',          clave: 'FechaOrdenPago',         tipo: 'fecha',      ancho: 11 },
  { titulo: 'Tarifa ODP',        clave: 'TarifaPagoODP',          tipo: 'entero',     ancho: 12 },
  { titulo: 'Peso ODP',          clave: 'PesoODP',                tipo: 'entero',     ancho: 11 },
  { titulo: 'Pago fletes',       clave: 'VrPagoFletes',           tipo: 'moneda',     ancho: 16 },
  { titulo: 'Desc. flete',       clave: 'DescuentoFlete',         tipo: 'moneda',     ancho: 15 },
  { titulo: 'Flete final',       clave: 'FleteFinal',             tipo: 'moneda',     ancho: 16 },
  { titulo: 'Bono x remesa',     clave: 'BonoxRemesa',            tipo: 'moneda',     ancho: 14 },
  { titulo: 'Causación',         clave: 'CausacionPorRemesa',     tipo: 'moneda',     ancho: 14 },
  { titulo: 'Carg. y desc.',     clave: 'CargYDescxRemesa',       tipo: 'moneda',     ancho: 14 },
  { titulo: 'Utilidad',          clave: 'Utilidad',               tipo: 'moneda',     ancho: 16 },
  { titulo: 'Utilidad real',     clave: 'UtilidadReal',           tipo: 'moneda',     ancho: 16 },
  { titulo: '% util. presup.',   clave: 'PctUtilPresupuesto',     tipo: 'porcentaje', ancho: 13 },
  { titulo: '% util. s/2,7%',    clave: 'PctUtilidadSin27',       tipo: 'porcentaje', ancho: 13 },
  { titulo: '% util. c/2,7%',    clave: 'PctUtilidadCon27',       tipo: 'porcentaje', ancho: 13 },
  /* Las tres que no estan en la pantalla. */
  { titulo: 'Condición factura', clave: 'ReglaFactura',           tipo: 'texto',      ancho: 34 },
  { titulo: 'Condición flete',   clave: 'ReglaFlete',             tipo: 'texto',      ancho: 34 },
  { titulo: 'Tasa desc. flete',  clave: 'TasaDescuentoFlete',     tipo: 'porcentaje', ancho: 13 }
];
