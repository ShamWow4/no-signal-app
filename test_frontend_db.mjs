import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
const db = getFirestore(app);

async function test() {
  const cols = ['av_news', 'av_gigs', 'av_training', 'labor_directory', 'calendar_events'];
  for (const c of cols) {
    try {
      const snap = await getDocs(collection(db, c));
      console.log(`Frontend ${c} docs: ${snap.size}`);
    } catch (e) {
      console.error(`Frontend ${c} error: ${e.message}`);
    }
  }
}
test();
