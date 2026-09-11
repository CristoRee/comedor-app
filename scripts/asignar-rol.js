const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const ROLES = ['alumno', 'cocinero', 'encargado', 'admin', 'superadmin'];

const [correo, rol, institucionId] = process.argv.slice(2);

if (!correo || !ROLES.includes(rol)) {
  console.error(`Uso: node scripts/asignar-rol.js <correo> <${ROLES.join('|')}> [institucionId]`);
  process.exit(1);
}

if (rol !== 'superadmin' && !institucionId) {
  console.error(`El rol ${rol} necesita un institucionId.`);
  console.error('Instituciones disponibles: node scripts/crear-institucion.js --listar');
  process.exit(1);
}

const credencial = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(credencial)) {
  console.error('Falta scripts/service-account.json.');
  console.error('Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.');
  process.exit(1);
}

initializeApp({ credential: cert(require(credencial)) });

async function asignar() {
  const firestore = getFirestore();

  if (institucionId) {
    const institucion = await firestore.collection('instituciones').doc(institucionId).get();
    if (!institucion.exists) {
      throw new Error(`No existe la institución ${institucionId}.`);
    }
  }

  const usuario = await getAuth().getUserByEmail(correo);

  // El claim se usa solo para 'superadmin': es el único rol que no se puede
  // repartir desde la app, y por eso vive donde la app no puede escribir. Los
  // demás roles los lee la app del documento, y los cambia el superadmin.
  await getAuth().setCustomUserClaims(usuario.uid, rol === 'superadmin' ? { rol } : null);
  await firestore
    .collection('usuarios')
    .doc(usuario.uid)
    .set({ rol, estado: 'activo', ...(institucionId ? { institucionId } : {}) }, { merge: true });

  console.log(`${correo}: rol ${rol}${institucionId ? ` en ${institucionId}` : ''} (uid ${usuario.uid}).`);
  if (rol === 'superadmin') {
    console.log('Debe cerrar sesión y volver a entrar: el claim se emite al iniciar sesión.');
  } else {
    console.log('El cambio se aplica en el acto, sin cerrar sesión.');
  }
}

asignar().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
