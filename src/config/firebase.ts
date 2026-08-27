import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDtI9b5bIzjUXszKtZU4i0QqFLzpxEHsiM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "janta-live-setu-8c68b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "janta-live-setu-8c68b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "janta-live-setu-8c68b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "661183221610",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:661183221610:web:c19e4c3afe1d5e75fedf13",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KVNEPLNWXP",
};

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
