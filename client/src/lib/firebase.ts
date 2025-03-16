import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with basic configuration
const db = getFirestore(app);

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

export { app, db };