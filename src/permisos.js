// Qué puede hacer el admin de cada institución. El superadmin los activa o
// desactiva por institución; si el documento todavía no los tiene, valen todos.
export const PERMISOS_DEL_ADMIN = [
  {
    clave: 'ajustarPrecios',
    titulo: 'Ajustar precios',
    descripcion: 'Puede cambiar el precio del ticket, la cuponera y la mensualidad.',
  },
  {
    clave: 'verRegistroDePagos',
    titulo: 'Ver el registro de pagos',
    descripcion: 'Puede consultar el historial de cobros de su institución.',
  },
  {
    clave: 'verContadores',
    titulo: 'Ver la pantalla del comedor',
    descripcion: 'Puede mirar los contadores del día desde su cuenta.',
  },
];

export const PERMISOS_POR_DEFECTO = {
  ajustarPrecios: true,
  verRegistroDePagos: true,
  verContadores: true,
};

export function permisoDelAdmin(institucion, clave) {
  return institucion?.permisosDelAdmin?.[clave] ?? PERMISOS_POR_DEFECTO[clave] ?? false;
}

export function permisosDeLaInstitucion(institucion) {
  return PERMISOS_DEL_ADMIN.reduce(
    (total, permiso) => ({ ...total, [permiso.clave]: permisoDelAdmin(institucion, permiso.clave) }),
    {}
  );
}

// La barra de navegación de cada rol sale de acá para que no se desincronice
// entre pantallas.
export function navegacionDe(rol, institucion) {
  if (rol === 'cocinero') {
    return [
      { titulo: 'Menú', ruta: '/cocinero' },
      { titulo: 'Comedor', ruta: '/comedor' },
    ];
  }

  if (rol === 'encargado') {
    return [
      { titulo: 'Escáner', ruta: '/encargado' },
      { titulo: 'Por cédula', ruta: '/encargado/manual' },
      { titulo: 'Comedor', ruta: '/comedor' },
    ];
  }

  if (rol === 'admin') {
    return [
      { titulo: 'Registros', ruta: '/admin' },
      { titulo: 'Alumnos', ruta: '/alumnos' },
      permisoDelAdmin(institucion, 'verRegistroDePagos') && { titulo: 'Pagos', ruta: '/pagos' },
      permisoDelAdmin(institucion, 'verContadores') && { titulo: 'Comedor', ruta: '/comedor' },
    ].filter(Boolean);
  }

  return [];
}
