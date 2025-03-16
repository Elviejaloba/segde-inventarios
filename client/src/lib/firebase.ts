import { initializeApp } from "firebase/app";
import { initializeFirestore, CACHE_SIZE_UNLIMITED, enableIndexedDbPersistence } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "374297020151",
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with optimized settings
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  experimentalForceLongPolling: true, // Solo usar long polling para mayor estabilidad
});

// Habilitar persistencia offline
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistencia solo disponible en una pestaña a la vez');
  } else if (err.code === 'unimplemented') {
    console.warn('Navegador no soporta persistencia');
  }
});

export { app, db };