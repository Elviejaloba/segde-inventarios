import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, enableNetwork, disableNetwork } from "firebase/firestore";

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
  experimentalForceLongPolling: true, // Usar polling en lugar de WebSocket
});

// Función para verificar la conexión
export const checkFirebaseConnection = async () => {
  try {
    await disableNetwork(db);
    await enableNetwork(db);
    console.log("Conexión a Firebase verificada y restablecida");
    return true;
  } catch (error) {
    console.error("Error en la conexión a Firebase:", error);
    return false;
  }
};

export { app, db };