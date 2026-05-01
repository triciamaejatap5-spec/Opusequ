import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
const firebaseConfigSafe = firebaseConfig && Object.keys(firebaseConfig).length > 0 ? { ...firebaseConfig, projectId: "opusequ" } : {
  apiKey: "missing",
  authDomain: "missing",
  projectId: "opusequ",
  storageBucket: "missing",
  messagingSenderId: "missing",
  appId: "missing"
};

const app = initializeApp(firebaseConfigSafe);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

export const isFirebaseConfigured = firebaseConfig && Object.keys(firebaseConfig).length > 0 && firebaseConfig.apiKey !== "missing";

// Enable Offline Persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time.
    console.warn("Firestore persistence failed: Multiple tabs open");
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn("Firestore persistence failed: Browser not supported");
  }
});

export const storage = getStorage(app);
