const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function limpiarNumeros(texto) {
  return (texto || '').replace(/\D/g, '');
}

export function validarNombre(texto) {
  if (!texto?.trim()) return 'Campo obligatorio.';
  if (texto.trim().length < 2) return 'Debe tener al menos 2 letras.';
  return null;
}

export function validarCorreo(texto) {
  if (!texto?.trim()) return 'Campo obligatorio.';
  if (!CORREO.test(texto.trim())) return 'El correo no es válido.';
  return null;
}

export function validarCedula(texto) {
  const digitos = limpiarNumeros(texto);
  if (!digitos) return 'Campo obligatorio.';
  if (digitos.length < 7 || digitos.length > 8) return 'La cédula debe tener 7 u 8 dígitos.';
  return null;
}

export function validarTelefono(texto) {
  const digitos = limpiarNumeros(texto);
  if (!digitos) return 'Campo obligatorio.';
  if (digitos.length < 8 || digitos.length > 9) return 'El teléfono debe tener 8 o 9 dígitos.';
  return null;
}

export function parsearFecha(texto) {
  const partes = (texto || '').split('/');
  if (partes.length !== 3) return null;

  const [dia, mes, anio] = partes.map((parte) => Number(parte));
  if (!dia || !mes || !anio || String(anio).length !== 4) return null;

  const fecha = new Date(anio, mes - 1, dia);
  const coincide =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;

  return coincide ? fecha : null;
}

export function validarFechaNacimiento(texto) {
  if (!texto?.trim()) return 'Campo obligatorio.';

  const fecha = parsearFecha(texto);
  if (!fecha) return 'Usá el formato dd/mm/aaaa.';

  const anios = (Date.now() - fecha.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (anios < 10 || anios > 100) return 'Revisá la fecha de nacimiento.';

  return null;
}

export function validarContrasenia(texto) {
  if (!texto) return 'Campo obligatorio.';
  if (texto.length < 6) return 'Debe tener al menos 6 caracteres.';
  return null;
}

const MENSAJES_AUTH = {
  'auth/invalid-email': 'El correo no es válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta registrada con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada. Consultá con administración.',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Esperá unos minutos.',
  'auth/network-request-failed': 'Sin conexión. Revisá el wifi o los datos del celular.',
};

export function mensajeDeError(error) {
  return MENSAJES_AUTH[error?.code] ?? 'No se pudo completar la operación. Intentá de nuevo.';
}
