import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPAvMINyDHyo7-KElEBhP1buZAbfBfqdU",
  authDomain: "check-d1753.firebaseapp.com",
  projectId: "check-d1753",
  storageBucket: "check-d1753.appspot.com",
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);
console.log('Firestore initialized successfully');

// Initialize Auth with persistence
const auth = getAuth(app);

// Set persistence to LOCAL
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Firebase auth persistence set to LOCAL');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', {
      code: error.code,
      message: error.message,
      details: 'This might affect session persistence'
    });
  });

// Set language to match browser
auth.useDeviceLanguage();

// Log auth state changes
auth.onAuthStateChanged((user) => {
  console.log('Auth state changed:', {
    isSignedIn: !!user,
    email: user?.email,
    emailVerified: user?.emailVerified,
    hasUser: !!user
  });
});

console.log('Firebase auth initialized successfully');

export { app, auth, db };