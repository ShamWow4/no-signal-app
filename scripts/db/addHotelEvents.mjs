import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// Helper to format ISO strings
const fd = (dateStr) => {
  const d = new Date(dateStr);
  if (!isNaN(d)) return d.toISOString();
  return dateStr;
};

const rawEvents = [
  // Page 1
  { name: 'NATIONAL STRENGTH AND CONDITIONING ASSOCIATION CONFERENCE & EXHIBITION', venue: 'Hyatt Regency New Orleans', loadIn: '07/08/2026 08:00 am', loadOut: '07/10/2026 06:00 pm' },
  { name: 'BLET Regional Meetings 2026', venue: 'Hilton New Orleans Riverside', loadIn: '07/13/2026 07:00 am', loadOut: '07/16/2026 07:00 pm' },
  { name: 'CSTA Annual Conference 2026', venue: 'Sheraton New Orleans', loadIn: '07/13/2026 12:00 pm', loadOut: '07/15/2026 05:00 pm' },
  { name: 'AAFP - 2026 DPC Summit', venue: 'Hyatt Regency New Orleans', loadIn: '07/17/2026 07:00 am', loadOut: '07/18/2026 01:30 pm' },
  { name: 'NSPRA 2026 - New Orleans', venue: 'Hilton New Orleans Riverside', loadIn: '07/20/2026 07:00 am', loadOut: '07/21/2026 03:30 pm' },
  { name: '2026 ACCE NATIONAL CONVENTION', venue: 'Hyatt Regency New Orleans', loadIn: '07/20/2026 05:00 pm', loadOut: '07/22/2026 03:00 pm' },
  { name: '2026 NAHJ Annual International Conference & Career Expo', venue: 'New Orleans Marriott', loadIn: '07/22/2026 08:00 am', loadOut: '07/24/2026 05:00 pm' },
  { name: 'Smoothie King Vendor Fair', venue: 'Hyatt Regency New Orleans', loadIn: '07/26/2026 07:00 pm', loadOut: '07/27/2026 02:00 pm' },
  { name: 'Doll Dreamers Market', venue: 'Astor Crowne Plaza', loadIn: '07/27/2026 08:00 am', loadOut: '07/29/2026 04:00 pm' },
  { name: 'WTC 2026 - National Association of Ticket Brokers', venue: 'Hyatt Regency New Orleans', loadIn: '07/27/2026 12:30 pm', loadOut: '07/29/2026 04:00 pm' },

  // Page 2
  { name: 'NAEA 2026 Tax Summit', venue: 'New Orleans Marriott', loadIn: '07/27/2026 05:30 pm', loadOut: '07/29/2026 01:00 pm' },
  { name: 'LMHPCO 2026', venue: 'Loews New Orleans Hotel', loadIn: '07/29/2026 08:00 am', loadOut: '07/31/2026 12:00 pm' },
  { name: '2026 SAA Annual Meeting', venue: 'Hyatt Regency New Orleans', loadIn: '07/30/2026 04:30 pm', loadOut: '07/31/2026 04:00 pm' },
  { name: 'ASTIP Traffic Rec 2026 Nola', venue: 'Sheraton New Orleans', loadIn: '08/03/2026 08:00 am', loadOut: '08/04/2026 05:00 pm' },
  { name: 'IRS Nationwide Tax Forum 2026', venue: 'Hyatt Regency New Orleans', loadIn: '08/04/2026 11:00 am', loadOut: '08/05/2026 02:30 pm' },
  { name: 'AEJMC 2026 Conference', venue: 'New Orleans Marriott', loadIn: '08/05/2026 12:00 pm', loadOut: '08/07/2026 05:00 pm' },
  { name: 'IHIA - New Orleans Marriott Warehouse Arts District Hotel', venue: 'New Orleans Marriott Warehouse Arts District', loadIn: '08/10/2026 09:00 am', loadOut: '08/13/2026 08:00 am' },
  { name: 'DHITS 2026', venue: 'Hyatt Regency New Orleans', loadIn: '08/10/2026 10:00 am', loadOut: '08/13/2026 01:00 pm' },
  { name: 'Pipeline Safety Conference 2026 - New Orleans', venue: 'Hilton New Orleans Riverside', loadIn: '08/11/2026 07:30 am', loadOut: '08/13/2026 09:30 am' },
  { name: 'Convergence 2026', venue: 'Sheraton New Orleans', loadIn: '08/13/2026 10:00 am', loadOut: '08/16/2026 05:00 pm' },

  // Page 3
  { name: 'Convergence Biennial Convention', venue: 'Sheraton New Orleans', loadIn: '08/13/2026 10:00 am', loadOut: '08/16/2026 05:00 pm' },
  { name: 'Perrone & Sons Food Show 2026', venue: 'Hilton New Orleans Riverside', loadIn: '08/16/2026 10:00 am', loadOut: '08/16/2026 05:00 pm' },
  { name: 'AHE 2026 ANNUAL MEETING Hyatt New Orleans', venue: 'Hyatt Regency New Orleans', loadIn: '08/17/2026 03:00 pm', loadOut: '08/18/2026 02:00 pm' },
  { name: 'LDI Confernece 2026 - New Orleans', venue: 'Hilton New Orleans Riverside', loadIn: '08/19/2026 07:30 am', loadOut: '08/20/2026 12:00 pm' },
  { name: 'Rotary International - Zones 30 & 31 Institute Annual Conference 2026', venue: 'Hilton New Orleans Riverside', loadIn: '08/27/2026 07:00 am', loadOut: '08/29/2026 11:00 pm' },
  { name: 'Anime Conclave 2026', venue: 'Hilton New Orleans Riverside', loadIn: '08/29/2026 10:00 am', loadOut: '08/30/2026 05:00 pm' },
  { name: 'YNOW2026 Users Conference', venue: 'Hilton New Orleans Riverside', loadIn: '09/01/2026 07:00 am', loadOut: '09/03/2026 02:00 pm' }
];

async function addHotelEvents() {
  console.log("Adding manually sourced hotel events...");
  
  const snapshot = await db.collection('calendar_events').get();
  const existingEvents = new Set();
  snapshot.forEach(doc => {
    existingEvents.add(doc.data().name.trim().toLowerCase());
  });
  
  const batch = db.batch();
  let added = 0;
  
  for (const raw of rawEvents) {
    const eventNameLower = raw.name.trim().toLowerCase();
    
    if (existingEvents.has(eventNameLower)) {
      continue;
    }
    
    // Normalize venue name for CalendarScreen tags
    let venueName = raw.venue;
    if (venueName.includes('Hyatt Regency')) venueName = 'Hyatt Regency';
    else if (venueName.includes('Hilton')) venueName = 'Hilton Riverside';
    else if (venueName.includes('Sheraton')) venueName = 'Sheraton New Orleans';
    else if (venueName.includes('Marriott')) venueName = 'Marriott';
    else if (venueName.includes('Astor')) venueName = 'Astor Crowne Plaza';
    else if (venueName.includes('Loews')) venueName = 'Loews New Orleans';
    
    const newDocRef = db.collection('calendar_events').doc();
    batch.set(newDocRef, {
      name: raw.name.trim(),
      venue: venueName,
      hall: '',
      loadIn: fd(raw.loadIn),
      loadOut: fd(raw.loadOut),
      url: '',
      type: 'Convention'
    });
    
    existingEvents.add(eventNameLower);
    added++;
  }
  
  if (added > 0) {
    console.log(`Committing ${added} new events to Firestore...`);
    await batch.commit();
    console.log(`Successfully added ${added} new hotel events to Firestore!`);
  } else {
    console.log("No new events to add (all up to date).");
  }
}

addHotelEvents().catch(console.error);
