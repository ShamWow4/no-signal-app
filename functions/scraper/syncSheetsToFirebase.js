import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase
const SERVICE_ACCOUNT_FILE = path.join(__dirname, '../serviceAccountKey.json');
if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
  console.error(`Error: Cannot find ${SERVICE_ACCOUNT_FILE}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// Google Sheets setup
const SPREADSHEET_ID = '1q3UNaTuyHbJ630R8UPZyxcGow00HQGaaRZ6YiSOEB1A';
const CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');

// Generate a deterministic MD5 hash for IDs
function generateId(string) {
    return crypto.createHash('md5').update(string).digest('hex');
}

async function getSheetData(sheets, range) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });
        
        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];
        
        const headers = rows[0];
        const data = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const obj = {};
            headers.forEach((h, index) => {
                obj[h.trim()] = row[index] ? row[index].trim() : '';
            });
            data.push(obj);
        }
        return data;
    } catch (error) {
        console.error(`Error fetching data from ${range}:`, error.message);
        return [];
    }
}

async function pushToCollection(collectionName, data, idFieldGetter) {
    if (data.length === 0) {
        console.log(`No data to push to ${collectionName}.`);
        return 0;
    }
    
    console.log(`Pushing ${data.length} items to ${collectionName}...`);
    const batch = db.batch();
    const collectionRef = db.collection(collectionName);
    
    let count = 0;
    let newItemsCount = 0;

    for (const item of data) {
        const idString = idFieldGetter(item);
        if (!idString) continue;
        
        const docId = generateId(idString);
        const docRef = collectionRef.doc(docId);
        
        // We could check if doc exists to count new items, but to save reads 
        // we'll just overwrite/merge everything.
        batch.set(docRef, item, { merge: true });
        count++;
        
        if (count % 400 === 0) {
            await batch.commit();
            console.log(`Committed ${count} items...`);
        }
    }
    if (count % 400 !== 0) {
        await batch.commit();
    }
    console.log(`Successfully pushed ${count} items to ${collectionName}.`);
    return count;
}

async function run() {
    console.log("Authenticating with Google Sheets...");
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error(`Error: Credentials file not found at ${CREDENTIALS_PATH}`);
        return;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const syncConfigs = [
        { tab: 'calendar_events', collection: 'calendar_events', getId: item => item['Title'] ? item['Title'] + (item['Dates']||'') : null },
        { tab: 'news_feed', collection: 'av_news', getId: item => item['Title'] ? item['Title'] + (item['Date']||'') : null },
        { tab: 'gig_alerts', collection: 'av_gigs', getId: item => item['Job Title'] ? item['Job Title'] + (item['Company']||'') : null },
        { tab: 'labor_directory', collection: 'labor_directory', getId: item => item['Company Name'] ? item['Company Name'] : null },
        { tab: 'av_training', collection: 'av_training', getId: item => item['Course Title'] ? item['Course Title'] : null }
    ];

    for (const config of syncConfigs) {
        console.log(`\nFetching data from ${config.tab}...`);
        const data = await getSheetData(sheets, `'${config.tab}'!A:Z`);
        await pushToCollection(config.collection, data, config.getId);
    }

    console.log("\nSync complete!");
}

run().catch(console.error);
