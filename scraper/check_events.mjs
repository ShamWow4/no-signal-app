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

async function check() {
  const snapshot = await db.collection('calendar_events').get();
  console.log(`Total calendar_events in Firestore: ${snapshot.size}`);
  let count = 0;
  snapshot.forEach(doc => {
    if (count < 5) {
      console.log(`Doc ${doc.id}:`, JSON.stringify(doc.data()));
      count++;
    }
  });
}

check().catch(console.error);
