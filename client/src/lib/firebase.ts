import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from "firebase/firestore";
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

// Initialize Firebase
console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);

// Initialize Firestore
console.log('Initializing Firestore...');
const db = getFirestore(app);

// Enable offline persistence
console.log('Enabling Firestore persistence...');
enableIndexedDbPersistence(db, {
  synchronizeTabs: true
}).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support persistence.');
  } else {
    console.error('Error enabling offline persistence:', err);
  }
});

// Initialize Auth
console.log('Initializing Firebase Auth...');
const auth = getAuth(app);

// Set persistence to LOCAL
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Firebase auth persistence set to LOCAL successfully');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', {
      code: error.code,
      message: error.message,
      details: 'Session persistence might not work as expected'
    });
  });

// Set language to match browser
auth.useDeviceLanguage();

// Log auth state changes
auth.onAuthStateChanged((user) => {
  console.log('Auth state changed:', {
    timestamp: new Date().toISOString(),
    isSignedIn: !!user,
    uid: user?.uid,
    email: user?.email,
    metadata: user?.metadata,
    providerId: user?.providerId
  });
});

export { app, auth, db };