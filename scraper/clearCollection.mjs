import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase
const SERVICE_ACCOUNT_FILE = path.join(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function clearCollection(collectionName) {
  console.log(`Clearing collection: ${collectionName}...`);
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`Collection '${collectionName}' is already empty.`);
    return;
  }

  let count = 0;
  let batch = db.batch();
  
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`Deleted ${count} documents so far...`);
    }
  }

  if (count % 400 !== 0) {
    await batch.commit();
  }
  
  console.log(`Successfully deleted ${count} documents from ${collectionName}.`);
}

async function run() {
  const targetCollection = process.argv[2] || 'labor_directory';
  await clearCollection(targetCollection);
  console.log("Done clearing!");
}

run().catch(console.error);
