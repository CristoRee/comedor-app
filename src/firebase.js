// Cliente de Firebase para Mi Bandeja.
//
// La apiKey no es un secreto: es un identificador público del proyecto y va
// incluida en toda app cliente de Firebase. Lo que protege los datos son las
// reglas de seguridad de Firestore, no ocultar esta clave.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDz1u-aM5enuJebOkeHD0G9h_Xh-dH0VJQ',
  authDomain: 'comedor-mi-bandeja.firebaseapp.com',
  projectId: 'comedor-mi-bandeja',
  storageBucket: 'comedor-mi-bandeja.firebasestorage.app',
  messagingSenderId: '334490664016',
  appId: '1:334490664016:web:dfb78c7d8433a2c5cea555',
};

// getApps() evita reinicializar la app en cada Fast Refresh de Metro.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// En React Native hay que usar initializeAuth con AsyncStorage: con getAuth()
// a secas la sesión se pierde al cerrar la app. El try/catch cubre el Fast
// Refresh, que vuelve a ejecutar este módulo sobre un auth ya inicializado.
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
