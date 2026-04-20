import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration from the user
const firebaseConfig = {
  apiKey: "AIzaSyCPUAhmI0gi-Y0ZeGyvXJ1El2bn-F9mD_I",
  authDomain: "opusequ.firebaseapp.com",
  projectId: "opusequ",
  storageBucket: "opusequ.firebasestorage.app",
  messagingSenderId: "758185218037",
  appId: "1:758185218037:web:d8060c6b83422547949abc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
