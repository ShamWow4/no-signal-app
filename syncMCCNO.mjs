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
  
  // Use built-in node fetch
  const response = await fetch("https://mccno.com/wp-content/uploads/events_json/full_calendar_json.json");
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }
  const data = await response.json();
  
  console.log(`Fetched ${data.length} events from MCCNO.`);
  
  // Get existing MCCNO events to avoid duplicates
  const snapshot = await db.collection('calendar_events').where('venue', '==', 'NOMCC').get();
  const existingEvents = new Set();
  snapshot.forEach(doc => {
    existingEvents.add(doc.data().name.trim().toLowerCase());
  });
  
  console.log(`Found ${existingEvents.size} existing NOMCC events in Firestore.`);
  
  const batch = db.batch();
  let added = 0;
  
  for (const event of data) {
    if (!event.title) continue;
    
    const eventName = event.title.trim();
    const eventNameLower = eventName.toLowerCase();
    
    if (existingEvents.has(eventNameLower)) {
      continue;
    }
    
    // Filter out past events
    const eventEndStr = event.endDT || event.end;
    if (!eventEndStr) continue;
    
    const eventEnd = new Date(eventEndStr);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    // Don't add events older than 2 weeks ago, to keep the DB clean
    if (eventEnd < twoWeeksAgo) {
      continue;
    }
    
    // Clean up URL
    let url = event.webAddress || '';
    if (url && !url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    const newDocRef = db.collection('calendar_events').doc();
    batch.set(newDocRef, {
      name: eventName,
      venue: 'NOMCC',
      hall: event.venue || '',
      loadIn: event.startDT || event.start,
      loadOut: event.endDT || event.end,
      url: url,
      type: 'Convention', // Default type for MCCNO events
      logo: event.eventLogoURL || '' // Useful if we ever add image support!
    });
    
    existingEvents.add(eventNameLower);
    added++;
  }
  
  if (added > 0) {
    console.log(`Committing ${added} new events to Firestore...`);
    await batch.commit();
    console.log(`Successfully added ${added} new official MCCNO events to Firestore!`);
  } else {
    console.log("No new future events to add (all up to date).");
  }
}

syncMCCNO().catch(console.error);
