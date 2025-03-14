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

console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);

console.log('Initializing Firestore...');
const db = getFirestore(app);

console.log('Initializing Firebase Auth...');
const auth = getAuth(app);

// Set persistence to LOCAL
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Firebase auth persistence set to LOCAL successfully');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

// Set language to match browser
auth.useDeviceLanguage();

export { app, auth, db };