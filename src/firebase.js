import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyC6SL4jUEoMgp6wC53R_OUsu0V0gxEBJQ8",
  authDomain: "nola-visual-arts-1f3cf.firebaseapp.com",
  projectId: "nola-visual-arts-1f3cf",
  storageBucket: "nola-visual-arts-1f3cf.firebasestorage.app",
  messagingSenderId: "204567994817",
  appId: "1:204567994817:web:ffe38efb7eb4b84cbd0f40",
  measurementId: "G-QRHS01GV9H"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app);
