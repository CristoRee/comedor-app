// Completa las instituciones ya creadas con los campos de configuración que se
// fueron agregando después. Es idempotente: solo escribe lo que falta.
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const VALORES_POR_DEFECTO = {
  horarios: {
    horaAperturaComedor: '11:30',
    horaLimiteMenu: '08:00',
    finDesayuno: '08:00',
    finAlmuerzo: '13:00',
    finMerienda: '18:00',
    finCena: '23:00',
  },
  edadCorteChicoGrande: 15,
  subroles: {
    internado: { activo: true, comidasHabilitadas: ['desayuno', 'almuerzo', 'merienda', 'cena'] },
  },
  contadores: { mostrarDesayuno: true, mostrarChicoGrande: true },
  precios: { ticket: null, cuponera: null, mensualidadInternado: null },
  permisosDelAdmin: { ajustarPrecios: true, verRegistroDePagos: true, verContadores: true },
};

const credencial = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(credencial)) {
  console.error('Falta scripts/service-account.json.');
  console.error('Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.');
  process.exit(1);
}

initializeApp({ credential: cert(require(credencial)) });

function esMapa(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function completar(contenedor, clave, porDefecto) {
  const existe = Object.prototype.hasOwnProperty.call(contenedor ?? {}, clave);

  if (!existe) return { valor: porDefecto, cambio: true };

  const actual = contenedor[clave];
  if (!esMapa(porDefecto) || !esMapa(actual)) return { valor: actual, cambio: false };

  let cambio = false;
  const valor = { ...actual };

  for (const [subclave, esperado] of Object.entries(porDefecto)) {
    const resultado = completar(actual, subclave, esperado);
    if (resultado.cambio) {
      valor[subclave] = resultado.valor;
      cambio = true;
    }
  }

  return { valor, cambio };
}

async function actualizar() {
  const firestore = getFirestore();
  const instituciones = await firestore.collection('instituciones').get();

  if (instituciones.empty) {
    console.log('No hay instituciones dadas de alta.');
    return;
  }

  for (const registro of instituciones.docs) {
    const datos = registro.data();
    const cambios = {};

    for (const [clave, porDefecto] of Object.entries(VALORES_POR_DEFECTO)) {
      const resultado = completar(datos, clave, porDefecto);
      if (resultado.cambio) cambios[clave] = resultado.valor;
    }

    if (!Object.keys(cambios).length) {
      console.log(`${registro.id}: ya estaba completa.`);
      continue;
    }

    await registro.ref.set(cambios, { merge: true });
    console.log(`${registro.id}: agregado ${Object.keys(cambios).join(', ')}.`);
  }
}

actualizar().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
