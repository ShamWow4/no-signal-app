import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function checkNola() {
  const snapshot = await db.collection('calendar_events').get();
  const nolaEvents = [];
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if ((data.venue && data.venue.toLowerCase().includes('new orleans')) || 
        (data.hall && data.hall.toLowerCase().includes('new orleans')) ||
        (data.hall && data.hall.toLowerCase().includes(' la')) ||
        (data.venue && data.venue.toLowerCase().includes('morial'))) {
      nolaEvents.push({ id: doc.id, ...data });
    }
  });
  console.log(`Found ${nolaEvents.length} NOLA events:`);
  console.log(JSON.stringify(nolaEvents.map(e => ({ name: e.name, venue: e.venue, hall: e.hall })), null, 2));
}

checkNola().catch(console.error);
