import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com`, // URL simplificada
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const firestoreDb = getFirestore(app);

// Initialize Realtime Database
const db = getDatabase(app);

// Retry operation with incremental backoff
export const retryOperation = async (operation: () => Promise<any>, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);
      lastError = error;

      if (attempt === maxRetries) break;

      // Simple incremental delay
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastError;
};

export { app, db, firestoreDb };