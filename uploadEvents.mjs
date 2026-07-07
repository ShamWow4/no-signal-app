import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// To run this script, you need a Firebase Service Account key.
// 1. Go to Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
// 2. Save the JSON file as 'serviceAccountKey.json' in this directory.
// 3. Make sure 'serviceAccountKey.json' is added to your .gitignore so it doesn't get committed!
const SERVICE_ACCOUNT_FILE = './serviceAccountKey.json';

if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
  console.error(`Error: Cannot find ${SERVICE_ACCOUNT_FILE}`);
  console.error("Please download your Firebase Service Account key and save it here.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

// Example dummy data format based on what CalendarScreen.js expects
const DUMMY_EVENTS = [
  {
    name: "Tech Convention 2026",
    venue: "MCCNO",
    hall: "Hall B",
    loadIn: "2026-08-10T08:00",
    loadOut: "2026-08-14T17:00",
    type: "Conference",
    url: "https://example.com/tech-convention"
  },
  {
    name: "Medical Expo",
    venue: "Hyatt Regency",
    hall: "Grand Ballroom",
    loadIn: "2026-08-20T07:00",
    loadOut: "2026-08-22T22:00",
    type: "Expo",
    url: "https://example.com/medical-expo"
  }
];

async function uploadEvents(events) {
  console.log(`Starting upload for ${events.length} events...`);
  let count = 0;

  for (const event of events) {
    try {
      // If you want to avoid duplicates, you can query first or use a deterministic ID
      // Here we just add a new document for simplicity
      const docRef = await db.collection('calendar_events').add(event);
      console.log(`✅ Uploaded ${event.name} with ID: ${docRef.id}`);
      count++;
    } catch (error) {
      console.error(`❌ Failed to upload ${event.name}:`, error);
    }
  }

  console.log(`\nFinished uploading ${count} events.`);
}

// Check if a JSON file was passed as an argument (e.g., node uploadEvents.mjs data.json)
const dataFile = process.argv[2];

if (dataFile) {
  if (fs.existsSync(dataFile)) {
    console.log(`Loading events from ${dataFile}...`);
    const fileData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    uploadEvents(fileData).then(() => process.exit(0));
  } else {
    console.error(`File not found: ${dataFile}`);
    process.exit(1);
  }
} else {
  console.log("No data file provided. Uploading dummy data for testing...");
  uploadEvents(DUMMY_EVENTS).then(() => process.exit(0));
}
