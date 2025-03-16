import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  getFirestore
} from "firebase/firestore";

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

// Initialize Firestore with basic settings
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser doesn\'t support all of the features required to enable persistence');
    }
  });

// Función para reintentar operaciones con backoff exponencial
export const retryOperation = async (operation: () => Promise<any>, maxRetries = 5) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
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