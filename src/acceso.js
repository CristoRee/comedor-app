import { fechaCorta } from './fechas';

function aFecha(marca) {
  return marca?.toDate ? marca.toDate() : null;
}

// Orden de prioridad: internado vigente, beca completa vigente, tickets.
// La media beca no da acceso: solo cambia el precio de lo que se cobra.
export function evaluarAcceso(perfil, ahora = new Date()) {
  if (!perfil) {
    return { permitido: false, motivo: 'No se encontró el alumno.' };
  }

  if (perfil.estado !== 'activo') {
    return { permitido: false, motivo: 'La cuenta no está habilitada.' };
  }

  const mensualidadHasta = aFecha(perfil.internado?.mensualidadHasta);

  if (perfil.internado?.activo) {
    if (mensualidadHasta && mensualidadHasta >= ahora) {
      return { permitido: true, medio: 'internado' };
    }
  }

  const beca = perfil.beca ?? {};
  const becaDesde = aFecha(beca.desde);
  const becaHasta = aFecha(beca.hasta);

  if (beca.tipo === 'completa' && becaHasta) {
    const empezo = !becaDesde || becaDesde <= ahora;
    if (empezo && becaHasta >= ahora) {
      return { permitido: true, medio: 'beca' };
    }
  }

  if ((perfil.tickets ?? 0) > 0) {
    return { permitido: true, medio: 'ticket' };
  }

  if (perfil.internado?.activo && mensualidadHasta) {
    return { permitido: false, motivo: `Mensualidad vencida el ${fechaCorta(mensualidadHasta)}.` };
  }

  if (beca.tipo === 'completa' && becaHasta) {
    return { permitido: false, motivo: `Beca vencida el ${fechaCorta(becaHasta)}.` };
  }

  return { permitido: false, motivo: 'Sin tickets disponibles.' };
}

export function resumenDeAcceso(perfil) {
  const { permitido, medio, motivo } = evaluarAcceso(perfil);

  if (!permitido) return motivo;
  if (medio === 'internado') return 'Internado con mensualidad al día';
  if (medio === 'beca') return 'Beca del comedor vigente';

  const tickets = perfil.tickets ?? 0;
  return tickets === 1 ? '1 ticket disponible' : `${tickets} tickets disponibles`;
}
