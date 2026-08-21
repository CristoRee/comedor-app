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

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// AsyncStorage mantiene la sesión iniciada entre reinicios de la app.
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
