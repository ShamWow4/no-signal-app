import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function keepOnlyNola() {
  const snapshot = await db.collection('calendar_events').get();
  const batch = db.batch();
  let deletedCount = 0;
  let updatedCount = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const isNola = (data.venue && data.venue.toLowerCase().includes('new orleans')) || 
                   (data.hall && data.hall.toLowerCase().includes('new orleans')) ||
                   (data.hall && data.hall.toLowerCase().includes(' la')) ||
                   (data.venue && data.venue.toLowerCase().includes('morial'));
                   
    if (!isNola) {
      batch.delete(doc.ref);
      deletedCount++;
    } else {
      // It's a NOLA event, let's normalize the venue name to match CalendarScreen.js
      let newVenueName = data.venue;
      if (data.venue.includes('Hyatt Regency')) newVenueName = 'Hyatt Regency';
      else if (data.venue.includes('Hilton')) newVenueName = 'Hilton Riverside';
      else if (data.venue.includes('Sheraton')) newVenueName = 'Sheraton New Orleans';
      else if (data.venue.includes('Marriott')) newVenueName = 'Marriott';
      else if (data.venue.includes('Morial') || data.venue.includes('NOMCC')) newVenueName = 'NOMCC';
      
      if (newVenueName !== data.venue) {
        batch.update(doc.ref, { venue: newVenueName });
      }
      updatedCount++;
    }
  });

  await batch.commit();
  console.log(`Deleted ${deletedCount} non-NOLA events.`);
  console.log(`Kept and formatted ${updatedCount} NOLA events.`);
}

keepOnlyNola().catch(console.error);
