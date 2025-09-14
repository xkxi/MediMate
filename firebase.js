import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjQoglD2QKavIP8yt-gopeSSxtPuLztQQ",
  authDomain: "health-companion-439c4.firebaseapp.com",
  projectId: "health-companion-439c4",
  storageBucket: "health-companion-439c4.firebasestorage.app",
  messagingSenderId: "54687273786",
  appId: "1:54687273786:web:8d41897ec0ee1413a4b603",
  measurementId: "G-PFEYTLJXTV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);