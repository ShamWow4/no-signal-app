import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function syncMCCNO() {
  console.log("Fetching Official MCCNO Events...");
  
  const response = await fetch("https://mccno.com/wp-content/uploads/events_json/full_calendar_json.json");
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }
  const data = await response.json();
  
  console.log(`Fetched ${data.length} events from MCCNO.`);
  
  // Get ALL existing MCCNO events and DELETE them to ensure a fresh sync
  const snapshot = await db.collection('calendar_events').where('venue', '==', 'NOMCC').get();
  
  const batch = db.batch();
  let deleted = 0;
  snapshot.forEach(doc => {
    batch.delete(doc.ref);
    deleted++;
  });
  
  console.log(`Deleting ${deleted} old NOMCC events...`);
  
  let added = 0;
  
  for (const event of data) {
    if (!event.title) continue;
    
    // Clean up URL
    let url = event.webAddress || '';
    if (url && !url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    const newDocRef = db.collection('calendar_events').doc();
    batch.set(newDocRef, {
      name: event.title.trim(),
      venue: 'NOMCC',
      hall: event.venue || '',
      loadIn: event.startDT || event.start,
      loadOut: event.endDT || event.end,
      url: url,
      type: 'Convention', 
      logo: event.eventLogoURL || '' 
    });
    
    added++;
  }
  
  console.log(`Committing ${deleted} deletions and ${added} new events to Firestore...`);
  await batch.commit();
  console.log(`Successfully synced MCCNO events!`);
}

syncMCCNO().catch(console.error);
