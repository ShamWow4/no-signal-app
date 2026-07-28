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

function parseDate(str) {
  if (!str) return null;
  if (str.includes('T')) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return null;
}

async function test() {
  const snapshot = await db.collection('calendar_events').get();
  let parsedCount = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  snapshot.forEach(doc => {
    const d = doc.data();
    let loadIn = d.loadIn || d['Show Start'] || d['ShowStart'];
    let loadOut = d.loadOut || d['Show End'] || d['ShowEnd'];
    if (!loadOut && loadIn) loadOut = loadIn;

    if (loadIn && (d.Title || d.name)) {
      parsedCount++;
    }
  });

  console.log(`Successfully parsed ${parsedCount} out of ${snapshot.size} calendar_events!`);
}

test().catch(console.error);
