import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const SERVICE_ACCOUNT_FILE = './serviceAccountKey.json';

if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
  console.error(`Error: Cannot find ${SERVICE_ACCOUNT_FILE}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

async function deleteAllEvents() {
  console.log("Fetching all events to delete...");
  const eventsRef = db.collection('calendar_events');
  const snapshot = await eventsRef.get();
  
  if (snapshot.empty) {
    console.log("No events found. Database is already clean.");
    return;
  }

  const batch = db.batch();
  let count = 0;
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  console.log(`Deleting ${count} records from calendar_events...`);
  await batch.commit();
  console.log(`Successfully deleted ${count} records!`);
}

deleteAllEvents().catch(console.error);
