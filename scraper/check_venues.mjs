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

async function run() {
  const snapshot = await db.collection('calendar_events').get();
  const venues = new Set();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.Venue || data.venue) venues.add(data.Venue || data.venue);
  });
  console.log("Venues: ", Array.from(venues).sort());
}
run().catch(console.error);
