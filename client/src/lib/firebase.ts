import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPAvMINyDHyo7-KElEBhP1buZAbfBfqdU",
  projectId: "check-d1753",
  storageBucket: "check-d1753.appspot.com",
  messagingSenderId: "374297020151",
  appId: "1:374297020151:web:d4a8325ef1171b43e6f5f2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Enable offline persistence for better performance and offline support
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.log('Multiple tabs open, persistence enabled in first tab');
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.log('Browser doesn\'t support persistence');
    }
  });

export { app, db };