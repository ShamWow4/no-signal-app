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
const SPREADSHEET_ID = '1q3UNaTuyHbJ630R8UPZyxcGow00HQGaaRZ6YiSOEB1A';
const CREDENTIALS_PATH = fs.existsSync(path.join(__dirname, 'google-credentials.json'))
    ? path.join(__dirname, 'google-credentials.json')
    : (fs.existsSync(path.join(__dirname, 'serviceAccountKey.json'))
        ? path.join(__dirname, 'serviceAccountKey.json')
        : path.join(__dirname, '../serviceAccountKey.json'));

const SERVICE_ACCOUNT_PATH = fs.existsSync(path.join(__dirname, 'serviceAccountKey.json'))
    ? path.join(__dirname, 'serviceAccountKey.json')
    : path.join(__dirname, '../serviceAccountKey.json');



/**
 * Mapping of Google Sheets tabs to target Firebase Firestore collections.
 * Each entry defines the source tab, target collection, and unique ID resolver.
 */
const SYNC_CONFIGS = [
    {
        tab: 'calendar_events',
        collection: 'calendar_events',
        getId: item => item['Title'] || item['name'] || null
    },
    {
        tab: 'news_feed',
        collection: 'av_news',
        getId: item => item['Title'] || null
    },
    {
        tab: 'gig_alerts',
        collection: 'av_gigs',
        getId: item => (item['Job Title'] ? `${item['Job Title']}_${item['Company'] || ''}` : null)
    },
    {
        tab: 'labor_directory',
        collection: 'labor_directory',
        getId: item => item['Company Name'] || null
    },
    {
        tab: 'av_training',
        collection: 'av_training',
        getId: item => item['Course Title'] || null
    },
    {
        tab: 'Union Events',
        collection: 'union_events',
        getId: item => (item['Event Title'] ? `${item['Event Title']}_${item['Date'] || ''}` : null)
    }
];

// ============================================================================
// FIREBASE & GOOGLE API INITIALIZATION
// ============================================================================
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
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    return google.sheets({ version: 'v4', auth });
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Normalizes text for deterministic ID generation by stripping accents, special chars, & casing.
 */
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

/**
 * Generates a deterministic MD5 hash for a given unique input string.
 */
function generateDocumentId(input) {
    const normalized = normalizeText(input);
    return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * Fetches and formats rows from a specific Google Sheets tab into key-value objects.
 */
async function fetchSheetData(sheets, tabName) {
    const range = `'${tabName}'!A:Z`;
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) return [];

        const [headers, ...dataRows] = rows;
        const cleanHeaders = headers.map(h => h.trim());

        return dataRows.map(row => {
            const item = {};
            cleanHeaders.forEach((header, idx) => {
                item[header] = row[idx] ? row[idx].trim() : '';
            });
            return item;
        });
    } catch (error) {
        if (error.message?.includes('Unable to parse range')) {
            console.log(`ℹ️  Tab '${tabName}' not found in spreadsheet. Skipping.`);
        } else {
            console.error(`⚠️ Error reading tab '${tabName}':`, error.message);
        }
        return [];
    }
}

/**
 * Pushes formatted data objects into a Firestore collection using batched writes,
 * and purges stale documents to guarantee zero duplicates.
 */
async function pushToFirestore(db, collectionName, items, getId) {
    if (!items || items.length === 0) {
        console.log(`ℹ️  No data to sync for collection '${collectionName}'.`);
        return 0;
    }

    console.log(`📦 Syncing ${items.length} items to Firestore collection '${collectionName}'...`);
    const collectionRef = db.collection(collectionName);
    
    // Fetch all existing doc IDs in Firestore to purge stale items
    const existingSnapshot = await collectionRef.get();
    const existingDocIds = new Set(existingSnapshot.docs.map(doc => doc.id));
    const newDocIds = new Set();

    let currentBatch = db.batch();
    let pendingCount = 0;
    let totalSynced = 0;

    // 1. Deduplicate items array by normalized document ID
    const uniqueItemsMap = new Map();
    for (const item of items) {
        const uniqueKey = getId(item);
        if (!uniqueKey) continue;
        const docId = generateDocumentId(uniqueKey);
        if (!uniqueItemsMap.has(docId)) {
            uniqueItemsMap.set(docId, item);
        }
    }

    const brandNewGigs = [];

    // 2. Set/update documents in batches
    for (const [docId, item] of uniqueItemsMap.entries()) {
        const docRef = collectionRef.doc(docId);
        newDocIds.add(docId);

        if (collectionName === 'av_gigs' && !existingDocIds.has(docId)) {
            brandNewGigs.push(item);
        }

        currentBatch.set(docRef, item, { merge: true });
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

    // Trigger Push Notifications for brand-new gig alerts
    if (collectionName === 'av_gigs' && brandNewGigs.length > 0) {
        console.log(`🚨 Found ${brandNewGigs.length} new gig alert(s)! Sending push notifications to users...`);
        await sendGigPushNotifications(db, brandNewGigs);
    }


    // 3. Purge stale / old duplicate document IDs not present in current sheet source
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

/**
 * Sends Expo Push Notifications to all registered app users when new AV Gigs are detected.
 */
async function sendGigPushNotifications(db, newGigs) {
    try {
        const tokensSnapshot = await db.collection('push_tokens').get();
        if (tokensSnapshot.empty) {
            console.log('ℹ️  No registered push notification devices found in Firestore.');
            return;
        }

        const tokens = tokensSnapshot.docs
            .map(doc => doc.data().token)
            .filter(t => typeof t === 'string' && t.startsWith('ExpoPushToken['));

        if (tokens.length === 0) {
            console.log('ℹ️  No valid Expo push tokens registered in Firestore.');
            return;
        }

        console.log(`📲 Sending push notification to ${tokens.length} device(s) for ${newGigs.length} new gig alert(s)...`);

        const messages = [];
        for (const gig of newGigs) {
            const gigTitle = gig['Job Title'] || gig['Title'] || 'AV Opportunity';
            const company = gig['Company'] || gig['Source'] || 'NOLA AV';
            const location = gig['Location'] || 'New Orleans, LA';

            for (const token of tokens) {
                messages.push({
                    to: token,
                    sound: 'default',
                    title: `🚨 New Gig Alert: ${gigTitle}`,
                    body: `${company} • ${location}`,
                    data: { screen: 'gigs', link: gig['Link'] || '' }
                });
            }
        }

        for (let i = 0; i < messages.length; i += 100) {
            const chunk = messages.slice(i, i + 100);
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chunk),
            });
            const result = await response.json();
            console.log(`✅ Push notification batch sent successfully! (${chunk.length} notification(s))`);
        }
    } catch (err) {
        console.error('⚠️  Error sending push notifications:', err.message);
    }
}


// ============================================================================
// MAIN PIPELINE EXECUTION
// ============================================================================
async function runSyncPipeline() {
    console.log('====================================================');
    console.log('🔥 FIREBASE FIRESTORE SYNC STARTED 🔥');
    console.log('====================================================\n');

    const db = initFirestore();
    const sheets = initGoogleSheets();

    for (const config of SYNC_CONFIGS) {
        console.log(`\n▶ Fetching '${config.tab}' from Google Sheets...`);
        const items = await fetchSheetData(sheets, config.tab);
        await pushToFirestore(db, config.collection, items, config.getId);
    }

    console.log('\n====================================================');
    console.log('🎉 FIREBASE SYNC COMPLETE! All collections updated. 🎉');
    console.log('====================================================');
}

runSyncPipeline().catch(err => {
    console.error('❌ Fatal error in Firebase sync pipeline:', err);
    process.exit(1);
});
