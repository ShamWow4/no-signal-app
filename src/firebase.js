import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });

export const db = Platform.OS === 'web'
  ? getFirestore(app)
  : initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
export const functions = getFunctions(app);
