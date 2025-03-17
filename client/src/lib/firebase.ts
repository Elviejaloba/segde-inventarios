import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { connectDatabaseEmulator } from "firebase/database";

// First, log environment variables (hiding sensitive data)
console.log('Environment check:', {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  hasAppId: !!import.meta.env.VITE_FIREBASE_APP_ID
});

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "check-d1753.firebaseapp.com",
  databaseURL: "https://check-d1753-default-rtdb.firebaseio.com/",
  projectId: "check-d1753",
  storageBucket: "check-d1753.appspot.com",
  messagingSenderId: "374297020151",
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log('Firebase configuration:', {
  authDomain: firebaseConfig.authDomain,
  databaseURL: firebaseConfig.databaseURL,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  hasApiKey: !!firebaseConfig.apiKey,
  hasAppId: !!firebaseConfig.appId
});

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Only use emulator in development if explicitly enabled
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR) {
  connectDatabaseEmulator(db, 'localhost', 9000);
  console.log('Connected to Firebase emulator');
} else {
  console.log('Using production Firebase database');
}

console.log('Firebase initialization complete');
export { app, db };