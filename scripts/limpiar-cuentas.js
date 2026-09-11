// Borra las cuentas de Firebase Authentication que ya no tienen ficha en
// Firestore. Pasa cuando se elimina un usuario desde la app: el SDK del
// celular solo puede borrar el documento, no la cuenta de correo.
//
//   node scripts/limpiar-cuentas.js            → lista lo que borraría
//   node scripts/limpiar-cuentas.js --borrar   → borra de verdad
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const credencial = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(credencial)) {
  console.error('Falta scripts/service-account.json.');
  console.error('Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.');
  process.exit(1);
}

initializeApp({ credential: cert(require(credencial)) });

const borrarDeVerdad = process.argv.includes('--borrar');

async function limpiar() {
  const fichas = await getFirestore().collection('usuarios').get();
  const conFicha = new Set(fichas.docs.map((registro) => registro.id));

  const huerfanas = [];
  let pagina = await getAuth().listUsers(1000);

  while (true) {
    for (const cuenta of pagina.users) {
      if (!conFicha.has(cuenta.uid)) huerfanas.push(cuenta);
    }

    if (!pagina.pageToken) break;
    pagina = await getAuth().listUsers(1000, pagina.pageToken);
  }

  if (!huerfanas.length) {
    console.log('No hay cuentas huérfanas.');
    return;
  }

  for (const cuenta of huerfanas) {
    console.log(`${cuenta.email ?? '(sin correo)'}\t${cuenta.uid}`);
  }

  if (!borrarDeVerdad) {
    console.log(`\n${huerfanas.length} cuentas sin ficha. Volvé a correrlo con --borrar para eliminarlas.`);
    return;
  }

  await getAuth().deleteUsers(huerfanas.map((cuenta) => cuenta.uid));
  console.log(`\n${huerfanas.length} cuentas eliminadas.`);
}

limpiar().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
