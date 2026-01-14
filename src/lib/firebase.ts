import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCOTRL_1ohvqdIT7mcZQtLaJVM8R30tYfg",
  authDomain: "mars2blog.firebaseapp.com",
  projectId: "mars2blog",
  storageBucket: "mars2blog.firebasestorage.app",
  messagingSenderId: "181828969393",
  appId: "1:181828969393:web:ed5f94d840037c4142d390",
  measurementId: "G-PGX6QCE0TP"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'us-central1');

export { app, auth, db, storage, functions };
