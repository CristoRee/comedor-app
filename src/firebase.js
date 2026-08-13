// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDz1u-aM5enuJebOkeHD0G9h_Xh-dH0VJQ",
  authDomain: "comedor-mi-bandeja.firebaseapp.com",
  projectId: "comedor-mi-bandeja",
  storageBucket: "comedor-mi-bandeja.firebasestorage.app",
  messagingSenderId: "334490664016",
  appId: "1:334490664016:web:dfb78c7d8433a2c5cea555",
  measurementId: "G-1X16PB0DFL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);