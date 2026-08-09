import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function importTechs() {
  console.log("Reading techs_cleaned_for_sms.csv...");
  const rawText = readFileSync('./techs_cleaned_for_sms.csv', 'utf8');
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);

  const headers = parseCSVLine(lines[0]);
  console.log("Headers:", headers);

  let count = 0;
  const batchSize = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const name = cols[0]?.replace(/^"|"$/g, '');
    const phoneE164 = cols[1]?.replace(/^"|"$/g, '');
    const phoneFormatted = cols[2]?.replace(/^"|"$/g, '');
    const email = cols[3]?.replace(/^"|"$/g, '') || '';
    const role = cols[4]?.replace(/^"|"$/g, '') || 'AV Technician';

    if (!name || !phoneE164) continue;

    const docRef = db.collection('technicians').doc();
    batch.set(docRef, {
      name,
      phone: phoneE164,
      phoneFormatted,
      email,
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    count++;
    batchCount++;

    if (batchCount >= batchSize) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`✅ Successfully imported ${count} technicians into Firestore '/technicians' collection!`);
  process.exit(0);
}

importTechs().catch((err) => {
  console.error("Error importing technicians:", err);
  process.exit(1);
});
