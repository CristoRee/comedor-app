const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const departamentos = require('../src/departamentos.json');

const USO =
  'Uso: node scripts/crear-institucion.js <id> "<nombre>" "<departamento>" "<ciudad>" <horaApertura>\n' +
  '     node scripts/crear-institucion.js --listar';

// Configuración operativa inicial. Se ajusta después por institución desde la
// consola de Firebase o desde la pantalla de administración.
const CONFIGURACION_INICIAL = {
  horarios: {
    horaLimiteMenu: '08:00',
    finDesayuno: '08:00',
    finAlmuerzo: '13:00',
    finMerienda: '18:00',
    finCena: '23:00',
  },
  edadCorteChicoGrande: 15,
  subroles: {
    internado: {
      activo: true,
      comidasHabilitadas: ['desayuno', 'almuerzo', 'merienda', 'cena'],
    },
  },
  contadores: {
    mostrarDesayuno: true,
    mostrarChicoGrande: true,
  },
};

const credencial = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(credencial)) {
  console.error('Falta scripts/service-account.json.');
  console.error('Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.');
  process.exit(1);
}

initializeApp({ credential: cert(require(credencial)) });

async function listar() {
  const instituciones = await getFirestore().collection('instituciones').get();

  if (instituciones.empty) {
    console.log('No hay instituciones dadas de alta.');
    return;
  }

  instituciones.docs
    .map((registro) => ({ id: registro.id, ...registro.data() }))
    .sort((a, b) => a.departamento.localeCompare(b.departamento) || a.nombre.localeCompare(b.nombre))
    .forEach((institucion) => {
      const estado = institucion.activa ? 'activa' : 'inactiva';
      const apertura = institucion.horarios?.horaAperturaComedor ?? '—';
      console.log(
        `${institucion.id}\t${institucion.departamento}\t${institucion.nombre} (${estado}, abre ${apertura})`
      );
    });
}

async function crear([id, nombre, departamento, ciudad, horaApertura]) {
  if (!id || !nombre || !departamento || !ciudad || !horaApertura) {
    throw new Error(USO);
  }

  if (!departamentos.includes(departamento)) {
    throw new Error(`Departamento inválido. Opciones: ${departamentos.join(', ')}`);
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horaApertura)) {
    throw new Error('La hora de apertura debe tener el formato hh:mm.');
  }

  const referencia = getFirestore().collection('instituciones').doc(id);

  if ((await referencia.get()).exists) {
    throw new Error(`Ya existe una institución con el id ${id}.`);
  }

  await referencia.set({
    nombre,
    departamento,
    ciudad,
    activa: true,
    creadaEn: FieldValue.serverTimestamp(),
    ...CONFIGURACION_INICIAL,
    horarios: { horaAperturaComedor: horaApertura, ...CONFIGURACION_INICIAL.horarios },
  });

  console.log(`Institución ${id} creada y activa.`);
  console.log('Configuración operativa inicial:');
  console.log(`  apertura del comedor      ${horaApertura}`);
  console.log(`  límite de cambio de menú  ${CONFIGURACION_INICIAL.horarios.horaLimiteMenu}`);
  console.log(`  corte chicos/grandes      ${CONFIGURACION_INICIAL.edadCorteChicoGrande} años`);
  console.log('  internado                 activo, 4 comidas');
}

const argumentos = process.argv.slice(2);
const tarea = argumentos[0] === '--listar' ? listar() : crear(argumentos);

tarea.catch((error) => {
  console.error(error.message);
  process.exit(1);
});
