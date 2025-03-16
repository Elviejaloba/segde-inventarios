import { initializeApp } from "firebase/app";
import { initializeFirestore, enableNetwork, disableNetwork, getFirestore, connectFirestoreEmulator } from "firebase/firestore";

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

// Initialize Firestore with optimized settings for Replit environment
const db = getFirestore(app);

// Función para verificar la conexión
export const checkFirebaseConnection = async () => {
  try {
    await disableNetwork(db);
    // Esperar un tiempo suficiente antes de reconectar
    await new Promise(resolve => setTimeout(resolve, 2000));
    await enableNetwork(db);
    console.log("Conexión a Firebase verificada y restablecida");
    return true;
  } catch (error) {
    console.error("Error en la conexión a Firebase:", error);
    return false;
  }
};

// Función para reintentar operaciones con backoff exponencial
export const retryOperation = async (operation: () => Promise<any>, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Intento ${attempt}/${maxRetries} falló:`, error);

      if (attempt === maxRetries) throw error;

      // Backoff exponencial
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Intentar restablecer la conexión antes del siguiente intento
      await checkFirebaseConnection();
    }
  }
};

export { app, db };