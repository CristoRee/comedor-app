const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function claveDeFecha(fecha = new Date()) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function fechaLegible(fecha = new Date()) {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

export function fechaCorta(marca) {
  const fecha = marca?.toDate ? marca.toDate() : marca;
  return fecha instanceof Date ? fecha.toLocaleDateString('es-UY') : '—';
}

export function horaCorta(marca) {
  const fecha = marca?.toDate ? marca.toDate() : marca;
  if (!(fecha instanceof Date)) return '—';
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

export function minutosDelDia(fecha = new Date()) {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

export function minutosDeHora(hora) {
  if (typeof hora !== 'string') return null;
  const [horas, minutos] = hora.split(':').map(Number);
  return Number.isFinite(horas) && Number.isFinite(minutos) ? horas * 60 + minutos : null;
}

export function edadEnAnios(fechaNacimiento, referencia = new Date()) {
  const nacimiento = fechaNacimiento?.toDate ? fechaNacimiento.toDate() : fechaNacimiento;
  if (!(nacimiento instanceof Date)) return null;

  let edad = referencia.getFullYear() - nacimiento.getFullYear();
  const mes = referencia.getMonth() - nacimiento.getMonth();

  if (mes < 0 || (mes === 0 && referencia.getDate() < nacimiento.getDate())) edad -= 1;

  return edad;
}
