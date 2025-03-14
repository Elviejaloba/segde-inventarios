import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPAvMINyDHyo7-KElEBhP1buZAbfBfqdU",
  authDomain: "check-d1753.firebaseapp.com",
  projectId: "check-d1753",
  storageBucket: "check-d1753.firebasestorage.app",
  messagingSenderId: "374297020151",
  appId: "1:374297020151:web:d4a8325ef1171b43e6f5f2",
  measurementId: "G-KL2NYT9BQE"
};

// Debug: Log config (without sensitive values)
console.log('Firebase config loaded with:', {
  hasApiKey: !!firebaseConfig.apiKey,
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasAppId: !!firebaseConfig.appId
});

let app;
let auth;
let db;
let googleProvider;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');

  // Initialize Firestore
  db = getFirestore(app);
  console.log('Firestore initialized successfully');

  // Initialize Auth
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  console.log('Firebase auth initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export { app, auth, db, googleProvider };