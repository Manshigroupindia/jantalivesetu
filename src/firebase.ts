import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCuyP5DTQpXAAjZ3RmNz3EnFYxMjs1qv58",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "client-data-71998.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "client-data-71998",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "client-data-71998.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "612683633017",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:612683633017:web:5589be1ba96f39171bdfa8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DP1F8HYS4G"
};

// Initialize Firebase App exactly once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics failure must not break authentication.
    });
}

export default app;
