export const TICKETS_POR_CUPONERA = 20;

// La media beca descuenta la mitad de tickets y cuponeras. La mensualidad del
// internado no entra en el descuento.
export const CONCEPTOS = [
  {
    tipo: 'ticket',
    clavePrecio: 'ticket',
    titulo: 'Ticket suelto',
    detalle: 'Una comida.',
    tickets: 1,
    admiteMediaBeca: true,
    soloInternado: false,
  },
  {
    tipo: 'cuponera',
    clavePrecio: 'cuponera',
    titulo: `Cuponera de ${TICKETS_POR_CUPONERA} tickets`,
    detalle: `Suma ${TICKETS_POR_CUPONERA} comidas al saldo.`,
    tickets: TICKETS_POR_CUPONERA,
    admiteMediaBeca: true,
    soloInternado: false,
  },
  {
    tipo: 'mensualidad_internado',
    clavePrecio: 'mensualidadInternado',
    titulo: 'Mensualidad del internado',
    detalle: 'Habilita las comidas hasta fin de mes.',
    tickets: 0,
    admiteMediaBeca: false,
    soloInternado: true,
  },
];

export const CLAVES_DE_PRECIO = CONCEPTOS.map((concepto) => concepto.clavePrecio);

export function conceptoDe(tipo) {
  return CONCEPTOS.find((concepto) => concepto.tipo === tipo) ?? null;
}

export function precioDe(institucion, clavePrecio) {
  const valor = institucion?.precios?.[clavePrecio];
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 ? valor : null;
}

export function tieneMediaBecaVigente(perfil, ahora = new Date()) {
  const beca = perfil?.beca;
  if (beca?.tipo !== 'media') return false;

  const desde = beca.desde?.toDate?.();
  const hasta = beca.hasta?.toDate?.();

  return (!desde || desde <= ahora) && (!hasta || hasta >= ahora);
}

// Devuelve qué se le cobra a este alumno por este concepto, con el descuento
// ya aplicado si corresponde.
export function cobroDe(institucion, perfil, concepto) {
  const precioBase = precioDe(institucion, concepto.clavePrecio);

  if (precioBase === null) {
    return { precioBase: null, monto: null, descuentoAplicado: null };
  }

  const conDescuento = concepto.admiteMediaBeca && tieneMediaBecaVigente(perfil);

  return {
    precioBase,
    monto: conDescuento ? Math.round(precioBase / 2) : precioBase,
    descuentoAplicado: conDescuento ? 'media_beca' : null,
  };
}

export function formatearMonto(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return 'sin precio';

  return `$ ${String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function normalizarPrecio(texto) {
  const limpio = (texto ?? '').replace(',', '.').trim();

  if (!limpio) return { vacio: true, valor: null };

  const valor = Number(limpio);
  if (!Number.isFinite(valor) || valor < 0) return { vacio: false, valor: null };

  return { vacio: false, valor: Math.round(valor) };
}
