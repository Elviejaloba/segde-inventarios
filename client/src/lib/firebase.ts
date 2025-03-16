import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

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

// Initialize Firestore with aggressive caching and offline persistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Función para manejar reintentos con backoff exponencial
export const retryOperation = async (operation: () => Promise<any>, maxRetries = 5) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Intento ${attempt}/${maxRetries} falló:`, error);

      if (attempt === maxRetries) {
        throw error;
      }

      // Backoff exponencial con jitter
      const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      const jitter = Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
    }
  }
};

export { app, db };