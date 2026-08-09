import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION & PATHS
// ============================================================================
// Permanent Master Spreadsheet ID (Option 1)
const SPREADSHEET_ID = '1q3UNaTuyHbJ630R8UPZyxcGow00HQGaaRZ6YiSOEB1A';

const CREDENTIALS_PATH = fs.existsSync(path.join(__dirname, 'google-credentials.json'))
    ? path.join(__dirname, 'google-credentials.json')
    : (fs.existsSync(path.join(__dirname, '../google-credentials.json'))
        ? path.join(__dirname, '../google-credentials.json')
        : path.join(__dirname, 'serviceAccountKey.json'));

const SERVICE_ACCOUNT_PATH = fs.existsSync(path.join(__dirname, 'serviceAccountKey.json'))
    ? path.join(__dirname, 'serviceAccountKey.json')
    : path.join(__dirname, '../serviceAccountKey.json');

/**
 * Mapping of Google Sheets tabs to target Firebase Firestore collections.
 */
const SYNC_CONFIGS = [
    {
        tabNames: ['calendar_events', 'Master Calendar', 'Master calendar'],
        collection: 'calendar_events',
        getId: item => item['Title'] || item['Event'] || item['name'] || null
    },
    {
        tabNames: ['news_feed', 'Newsletter_AV News', 'Newsletter_AV news'],
        collection: 'av_news',
        getId: item => item['Title'] || item['Article'] || null
    },
    {
        tabNames: ['gig_alerts', 'Newsletter_Gigs', 'Newsletter_gigs'],
        collection: 'av_gigs',
        getId: item => (item['Job Title'] ? `${item['Job Title']}_${item['Company'] || ''}` : item['Title'] || null)
    },
    {
        tabNames: ['labor_directory', 'Newsletter_AV Directory', 'Newsletter_AV directory'],
        collection: 'labor_directory',
        getId: item => item['Company Name'] || item['Company'] || null
    },
    {
        tabNames: ['av_training', 'Newsletter_AV Training'],
        collection: 'av_training',
        getId: item => item['Course Title'] || item['Title'] || null
    }
];

function initFirestore() {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        throw new Error(`Firebase service account file not found: ${SERVICE_ACCOUNT_PATH}`);
    }

    if (getApps().length === 0) {
        const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
        initializeApp({ credential: cert(serviceAccount) });
    }

    return getFirestore();
}

function initGoogleSheets() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(`Google API credentials not found: ${CREDENTIALS_PATH}`);
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return google.sheets({ version: 'v4', auth });
}

function normalizeText(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/&amp;/g, '&')
        .replace(/[^a-z0-9]/g, '');
}

function generateDocumentId(input) {
    const normalized = normalizeText(input);
    return crypto.createHash('md5').update(normalized).digest('hex');
}

function canonicalizeItem(item, collectionName) {
    if (!item) return item;
    const cleanItem = { ...item };
    
    if (collectionName === 'labor_directory') {
        const companyName = item['Company Name'] || item['Company'] || item['company_name'] || item['name'] || '';
        const website = item['Website'] || item['Company Website'] || item['website'] || item['url'] || '';
        const phone = item['Contact Phone'] || item['Contact phone number'] || item['Contact Phon'] || item['Contact phone numt'] || item['phone'] || item['phoneNumber'] || '';
        const contact = item['Contact Name'] || item['Contact'] || item['contact'] || '';
        const position = item['Position'] || item['position'] || '';

        cleanItem['Company Name'] = companyName;
        cleanItem['Company'] = companyName;
        cleanItem['Website'] = website;
        cleanItem['Company Website'] = website;
        cleanItem['Contact Phone'] = phone;
        cleanItem['Contact phone number'] = phone;
        cleanItem['Contact Name'] = contact;
        cleanItem['Position'] = position;
    }

    if (collectionName === 'calendar_events') {
        const title = item['Title'] || item['Event'] || item['name'] || item['title'] || '';
        
        let rawLoadIn = item['Load-In Date'] || item['Load-In'] || item['loadIn'] || item['Load In Date'] || item['Show Start'] || item['Start Date'] || item['Dates'] || '';
        let rawLoadOut = item['Load-Out Date'] || item['Load-Out'] || item['loadOut'] || item['Load Out Date'] || item['Show End'] || item['End Date'] || '';

        // If rawLoadIn contains a date range string (e.g. "08/03/2026 - 08/07/2026")
        if (typeof rawLoadIn === 'string' && (rawLoadIn.includes(' - ') || rawLoadIn.includes(' – ') || rawLoadIn.includes(' — ') || rawLoadIn.toLowerCase().includes(' to '))) {
            const parts = rawLoadIn.split(/[-–—]| to /i).map(s => s.trim());
            if (parts.length >= 2) {
                rawLoadIn = parts[0];
                if (!rawLoadOut || rawLoadOut === item['Load-In Date']) {
                    rawLoadOut = parts[1];
                }
            }
        }

        const loadIn = rawLoadIn;
        const loadOut = rawLoadOut || loadIn;
        const venue = item['Venue'] || item['venue'] || '';
        const hall = item['Hall / Room'] || item['hall'] || '';
        const city = item['City'] || item['city'] || 'NEW ORLEANS, LA';
        const source = item['Source'] || item['source'] || 'Scraped';

        cleanItem['Title'] = title;
        cleanItem['name'] = title;
        cleanItem['Load-In Date'] = loadIn;
        cleanItem['loadIn'] = loadIn;
        cleanItem['Load-Out Date'] = loadOut;
        cleanItem['loadOut'] = loadOut;
        cleanItem['Venue'] = venue;
        cleanItem['venue'] = venue;
        cleanItem['Hall / Room'] = hall;
        cleanItem['hall'] = hall;
        cleanItem['City'] = city;
        cleanItem['city'] = city;
        cleanItem['Source'] = source;
        cleanItem['source'] = source;
    }
    
    return cleanItem;
}

async function fetchSheetData(sheets, candidateTabNames) {
    let existingSheetTitle = candidateTabNames[0];
    try {
        const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const existingTitles = spreadsheetInfo.data.sheets.map(s => s.properties.title);
        
        for (const name of candidateTabNames) {
            const found = existingTitles.find(t => t.toLowerCase().trim() === name.toLowerCase().trim());
            if (found) {
                existingSheetTitle = found;
                break;
            }
        }
    } catch (e) {
        existingSheetTitle = candidateTabNames[0];
    }

    const range = `'${existingSheetTitle}'!A:Z`;
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) return [];

        const [headers, ...dataRows] = rows;
        const cleanHeaders = headers.map(h => h ? h.trim() : '');

        return dataRows.map(row => {
            const item = {};
            cleanHeaders.forEach((header, idx) => {
                if (header) {
                    item[header] = row[idx] ? row[idx].trim() : '';
                }
            });
            return item;
        });
    } catch (error) {
        console.error(`⚠️ Error reading tab '${existingSheetTitle}':`, error.message);
        return [];
    }
}

async function pushToFirestore(db, collectionName, items, getId) {
    if (!items || items.length === 0) {
        console.log(`ℹ️  No data to sync for collection '${collectionName}'.`);
        return 0;
    }

    console.log(`📦 Syncing ${items.length} items to Firestore collection '${collectionName}'...`);
    const collectionRef = db.collection(collectionName);
    
    const existingSnapshot = await collectionRef.get();
    const existingDocIds = new Set(existingSnapshot.docs.map(doc => doc.id));
    const newDocIds = new Set();

    let currentBatch = db.batch();
    let pendingCount = 0;
    let totalSynced = 0;

    const uniqueItemsMap = new Map();
    for (const item of items) {
        const uniqueKey = getId(item);
        if (!uniqueKey) continue;
        const docId = generateDocumentId(uniqueKey);
        if (!uniqueItemsMap.has(docId)) {
            uniqueItemsMap.set(docId, item);
        }
    }

    for (const [docId, item] of uniqueItemsMap.entries()) {
        const docRef = collectionRef.doc(docId);
        newDocIds.add(docId);

        const cleanDoc = canonicalizeItem(item, collectionName);
        currentBatch.set(docRef, cleanDoc, { merge: true });
        pendingCount++;
        totalSynced++;

        if (pendingCount >= 400) {
            await currentBatch.commit();
            currentBatch = db.batch();
            pendingCount = 0;
        }
    }

    if (pendingCount > 0) {
        await currentBatch.commit();
        console.log(`   └─ Committed final write batch of ${pendingCount} items`);
    }

    const staleDocIds = [...existingDocIds].filter(id => !newDocIds.has(id));
    if (staleDocIds.length > 0) {
        console.log(`   🧹 Purging ${staleDocIds.length} stale/duplicate documents from '${collectionName}'...`);
        let purgeBatch = db.batch();
        let purgeCount = 0;
        for (const staleId of staleDocIds) {
            purgeBatch.delete(collectionRef.doc(staleId));
            purgeCount++;
            if (purgeCount >= 400) {
                await purgeBatch.commit();
                purgeBatch = db.batch();
                purgeCount = 0;
            }
        }
        if (purgeCount > 0) {
            await purgeBatch.commit();
        }
    }

    console.log(`✅ Successfully synced ${totalSynced} clean documents to '${collectionName}'.`);
    return totalSynced;
}

async function main() {
    console.log("====================================================");
    console.log("🔥 FIREBASE FIRESTORE SYNC STARTED 🔥");
    console.log("====================================================\n");

    try {
        const db = initFirestore();
        const sheets = initGoogleSheets();

        for (const config of SYNC_CONFIGS) {
            console.log(`\n▶ Fetching '${config.collection}' from Google Sheets...`);
            const items = await fetchSheetData(sheets, config.tabNames);
            await pushToFirestore(db, config.collection, items, config.getId);
        }

        console.log("\n====================================================");
        console.log("🎉 FIREBASE SYNC COMPLETE! All collections updated. 🎉");
        console.log("====================================================\n");
    } catch (error) {
        console.error("❌ Fatal error during Firebase sync:", error.message);
        process.exit(1);
    }
}

main();
