import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Use basic URL format
  databaseURL: `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com`
};

console.log('Initializing Firebase with config:', {
  ...firebaseConfig,
  apiKey: '[HIDDEN]' // No mostrar la API key en logs
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
const db = getDatabase(app);

export { app, db };