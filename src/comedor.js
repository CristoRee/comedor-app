import { minutosDeHora, minutosDelDia } from './fechas';

export const COMIDAS = ['desayuno', 'almuerzo', 'merienda', 'cena'];

export const NOMBRE_COMIDA = {
  desayuno: 'desayunar',
  almuerzo: 'almorzar',
  merienda: 'merendar',
  cena: 'cenar',
};

export function idMenu(institucionId, fecha) {
  return `${institucionId}_${fecha}`;
}

export function idAsistencia(institucionId, fecha, usuarioId) {
  return `${institucionId}_${fecha}_${usuarioId}`;
}

// El contador central rota durante el día según los horarios de la institución.
export function comidaCentral(horarios = {}, ahora = new Date()) {
  const minutos = minutosDelDia(ahora);
  const finAlmuerzo = minutosDeHora(horarios.finAlmuerzo) ?? 13 * 60;
  const finMerienda = minutosDeHora(horarios.finMerienda) ?? 18 * 60;
  const finCena = minutosDeHora(horarios.finCena) ?? 23 * 60;

  if (minutos < finAlmuerzo) return 'almuerzo';
  if (minutos < finMerienda) return 'merienda';
  if (minutos < finCena) return 'cena';

  return 'almuerzo';
}

export function desayunoVisible(institucion, ahora = new Date()) {
  if (!institucion?.contadores?.mostrarDesayuno) return false;

  const finDesayuno = minutosDeHora(institucion.horarios?.finDesayuno);
  return finDesayuno !== null && minutosDelDia(ahora) < finDesayuno;
}

export function comidasDelSubrol(institucion, perfil) {
  const internado = institucion?.subroles?.internado;

  if (perfil?.subrol !== 'internado' || !internado?.activo) return ['almuerzo'];

  return internado.comidasHabilitadas?.length ? internado.comidasHabilitadas : COMIDAS;
}
