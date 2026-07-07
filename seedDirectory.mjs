import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const companies = [
  {
    name: "Encore Global",
    type: "Corporate AV",
    phone: "+15045811000", // Placeholder format
    email: "nolacrew@encoreglobal.com",
    website: "https://encoreglobal.com",
    description: "In-house AV provider for many major New Orleans hotels including the Marriott and Sheraton.",
  },
  {
    name: "Freeman",
    type: "Production & Rigging",
    phone: "+15047389400",
    email: "neworleans@freemanco.com",
    website: "https://freeman.com",
    description: "Major contractor for the New Orleans Ernest N. Morial Convention Center.",
  },
  {
    name: "IATSE Local 39",
    type: "Labor Union",
    phone: "+15044828110",
    email: "dispatch@iatse39.org",
    website: "https://iatse39.org",
    description: "The premier labor union for stagehands and AV technicians in New Orleans.",
  },
  {
    name: "LMG",
    type: "Touring & Production",
    phone: "+18002275564",
    email: "info@lmg.net",
    website: "https://lmg.net",
    description: "High-end touring and large scale corporate production AV services.",
  },
  {
    name: "See-Hear Productions",
    type: "Local Production",
    phone: "+15048375678",
    email: "contact@seehearproductions.com",
    website: "https://seehearproductions.com",
    description: "Local AV and production company serving the greater New Orleans area.",
  },
  {
    name: "Crescent City Stage",
    type: "Theatrical Production",
    phone: "+15045551234",
    email: "info@crescentcitystage.com",
    website: "https://crescentcitystage.com",
    description: "A leading theatrical production team in the heart of NOLA.",
  },
  {
    name: "PSAV (Encore)",
    type: "Corporate AV",
    phone: "+15045610500",
    email: "psavnola@psav.com",
    website: "https://psav.com",
    description: "Former PSAV, now part of the Encore Global family.",
  }
];

async function seedDirectory() {
  console.log("Starting directory seed...");
  
  const directoryRef = db.collection('labor_directory');
  let addedCount = 0;

  for (const company of companies) {
    try {
      // Check if exists
      const snapshot = await directoryRef.where('name', '==', company.name).get();
      if (snapshot.empty) {
        await directoryRef.add(company);
        addedCount++;
        console.log(`Added: ${company.name}`);
      } else {
        console.log(`Skipped (already exists): ${company.name}`);
      }
    } catch (error) {
      console.error(`Error adding ${company.name}:`, error);
    }
  }

  console.log(`Successfully seeded ${addedCount} new companies.`);
}

seedDirectory().catch(console.error);
