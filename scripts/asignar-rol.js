const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const ROLES = ['alumno', 'cocinero', 'encargado', 'admin'];

const [correo, rol] = process.argv.slice(2);

if (!correo || !ROLES.includes(rol)) {
  console.error(`Uso: node scripts/asignar-rol.js <correo> <${ROLES.join('|')}>`);
  process.exit(1);
}

const credencial = path.join(__dirname, 'service-account.json');

initializeApp({ credential: cert(require(credencial)) });

async function asignar() {
  const usuario = await getAuth().getUserByEmail(correo);

  await getAuth().setCustomUserClaims(usuario.uid, { rol });
  await getFirestore()
    .collection('usuarios')
    .doc(usuario.uid)
    .set({ rol, estado: 'activo' }, { merge: true });

  console.log(`${correo}: rol ${rol} asignado (uid ${usuario.uid}).`);
  console.log('El usuario debe cerrar sesión y volver a entrar para que el token tome el rol.');
}

asignar().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
