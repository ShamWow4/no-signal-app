import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ACCOUNT_FILE = path.join(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function checkAll() {
  const collections = ['calendar_events', 'labor_directory', 'av_gigs', 'av_news', 'av_training'];
  for (const c of collections) {
    const snap = await db.collection(c).get();
    console.log(`Collection '${c}': ${snap.size} documents`);
  }
}

checkAll().catch(console.error);
