import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED,
  enableIndexedDbPersistence
} from "firebase/firestore";
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

console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);

console.log('Initializing Firestore...');
// Initialize Firestore with specific settings for better stability
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  retry: {
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffFactor: 1.5
  }
});

// Enable offline persistence after initialization
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('Firestore persistence enabled successfully');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support all of the features required to enable persistence');
    } else {
      console.error('Error enabling persistence:', err);
    }
  });

console.log('Initializing Firebase Auth...');
const auth = getAuth(app);

// Set persistence to LOCAL
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Firebase auth persistence set to LOCAL successfully');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', {
      code: error?.code,
      message: error?.message,
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