export const PALETAS = {
  claro: {
    fondo: '#f5f6f8',
    superficie: '#ffffff',
    superficieAlterna: '#eef1f5',
    presionado: '#eef2f7',
    texto: '#16181d',
    textoSuave: '#6b7280',
    borde: '#dfe3e8',
    primario: '#1f6feb',
    exito: '#137547',
    error: '#b3261e',
    advertencia: '#8a5a00',
    // Bloques de alto contraste: fondo oscuro con texto claro.
    destacado: '#16181d',
    destacadoTexto: '#ffffff',
    avisoInfo: '#e8f0fe',
    avisoInfoTexto: '#0b3d91',
    avisoError: '#fde8e6',
    avisoExito: '#e3f3e9',
    avisoAdvertencia: '#fdf1dd',
  },
  oscuro: {
    fondo: '#101217',
    superficie: '#191c22',
    superficieAlterna: '#222630',
    presionado: '#252a34',
    texto: '#f2f4f7',
    textoSuave: '#9aa3b0',
    borde: '#2a2f38',
    primario: '#4c8dff',
    exito: '#3ecf8e',
    error: '#ff6b60',
    advertencia: '#f0b849',
    destacado: '#1f4f9e',
    destacadoTexto: '#ffffff',
    avisoInfo: '#152742',
    avisoInfoTexto: '#a8c7fa',
    avisoError: '#3a1a18',
    avisoExito: '#12301f',
    avisoAdvertencia: '#332611',
  },
};

// El QR y el resultado del escáner no siguen el tema: se leen a distancia y en
// la puerta del comedor, donde el contraste no es negociable.
export const FIJOS = {
  qrFondo: '#ffffff',
  qrTinta: '#000000',
  escanerOk: '#137547',
  escanerMal: '#b3261e',
  escanerTexto: '#ffffff',
};

export const espaciado = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const tipografia = {
  titulo: 28,
  subtitulo: 18,
  cuerpo: 16,
  nota: 13,
};

export const radio = {
  sm: 8,
  md: 12,
  lg: 16,
};
