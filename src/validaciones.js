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

const MENSAJES = {
  // Autenticación
  'auth/invalid-email': 'El correo no es válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta registrada con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/password-does-not-meet-requirements':
    'La contraseña no cumple los requisitos del proyecto. Probá con una más larga.',
  'auth/missing-password': 'Escribí una contraseña.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada. Consultá con administración.',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Esperá unos minutos.',
  'auth/network-request-failed': 'Sin conexión. Revisá el wifi o los datos del celular.',
  'auth/operation-not-allowed':
    'El ingreso con correo y contraseña está desactivado en Firebase. Hay que habilitarlo en Authentication → Sign-in method.',
  'auth/invalid-api-key': 'La configuración de Firebase de la app no es válida.',
  'auth/configuration-not-found':
    'Falta configurar Authentication en Firebase. Habilitá el método de correo y contraseña.',

  // Firestore
  'permission-denied':
    'La base de datos rechazó la operación. Revisá que las reglas de firestore.rules estén publicadas en Firebase.',
  unavailable: 'No se pudo conectar con la base de datos. Revisá la conexión.',
  'deadline-exceeded': 'La conexión tardó demasiado. Probá de nuevo.',
  unauthenticated: 'La sesión venció. Volvé a iniciar sesión.',
  'failed-precondition': 'La base de datos necesita un índice que todavía no existe.',
};

// El código crudo se muestra al final a propósito: sin él, un fallo de
// configuración de Firebase es indistinguible de un problema de conexión.
export function mensajeDeError(error) {
  const codigo = error?.code;
  const conocido = MENSAJES[codigo];

  if (conocido) return conocido;
  if (codigo) return `No se pudo completar la operación (${codigo}).`;

  return 'No se pudo completar la operación. Intentá de nuevo.';
}

// Máscaras de entrada: el usuario escribe solo dígitos y los separadores se
// colocan solos mientras escribe.
export function formatoFecha(texto) {
  const digitos = limpiarNumeros(texto).slice(0, 8);

  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;

  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

export function formatoCedula(texto) {
  return limpiarNumeros(texto).slice(0, 8);
}

export function formatoTelefono(texto) {
  return limpiarNumeros(texto).slice(0, 9);
}

export function formatoCorreo(texto) {
  return texto.replace(/\s/g, '');
}
