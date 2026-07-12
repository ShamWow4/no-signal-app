import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Helper to parse TSV
function parseTSV(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) return [];
    const lines = raw.split('\n').map(l => l.split('\t'));
    const headers = lines[0];
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;
        const obj = {};
        headers.forEach((h, index) => {
            obj[h.trim()] = row[index] ? row[index].trim() : '';
        });
        data.push(obj);
    }
    return data;
}

// Generate a deterministic MD5 hash for IDs
function generateId(string) {
    return crypto.createHash('md5').update(string).digest('hex');
}

async function pushToCollection(collectionName, data, idFieldGetter) {
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
        
        // Check if doc exists
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            newItemsCount++;
        }
        
        // Use set with merge: true to update existing and add new
        batch.set(docRef, item, { merge: true });
        count++;
        
        // Firestore batches support up to 500 writes
        if (count % 400 === 0) {
            await batch.commit();
            console.log(`Committed ${count} items...`);
        }
    }
    if (count % 400 !== 0) {
        await batch.commit();
    }
    console.log(`Successfully pushed ${count} items to ${collectionName}. Found ${newItemsCount} NEW items.`);
    return newItemsCount;
}

async function sendPushNotification(title, body, dataPayload = {}) {
    try {
        const tokensSnapshot = await db.collection('push_tokens').get();
        if (tokensSnapshot.empty) return;

        const messages = [];
        tokensSnapshot.forEach(doc => {
            const pushToken = doc.data().token;
            if (pushToken && pushToken.startsWith('ExponentPushToken')) {
                messages.push({
                    to: pushToken,
                    sound: 'default',
                    title: title,
                    body: body,
                    data: dataPayload,
                });
            }
        });

        if (messages.length > 0) {
            console.log(`Sending push notification to ${messages.length} devices...`);
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messages),
            });
            const receipt = await response.json();
            console.log('Push notification receipt:', receipt);
        }
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}

async function run() {
    console.log("Starting Firebase Sync...");

    // 1. Events
    const events = parseTSV(path.join(__dirname, 'mccno_events.tsv'));
    const newEvents = await pushToCollection('calendar_events', events, item => item['Title'] ? item['Title'] + item['Dates'] : null);

    // 2. News
    const news = parseTSV(path.join(__dirname, 'av_news.tsv'));
    const newNews = await pushToCollection('av_news', news, item => item['Link']);

    // 3. Gigs
    const gigs = parseTSV(path.join(__dirname, 'av_gigs.tsv'));
    const newGigs = await pushToCollection('av_gigs', gigs, item => item['Link']);

    // 4. Training
    const training = parseTSV(path.join(__dirname, 'av_training.tsv'));
    await pushToCollection('av_training', training, item => item['Link']);

    // 5. Directory
    let allDir = [];
    if (fs.existsSync(path.join(__dirname, 'av_directory_baseline.tsv'))) {
        allDir = allDir.concat(parseTSV(path.join(__dirname, 'av_directory_baseline.tsv')));
    }
    if (fs.existsSync(path.join(__dirname, 'av_directory_new.tsv'))) {
        allDir = allDir.concat(parseTSV(path.join(__dirname, 'av_directory_new.tsv')));
    }
    await pushToCollection('labor_directory', allDir, item => item['Company Name'] ? item['Company Name'].toLowerCase() : null);

    console.log("All data successfully pushed to Firebase!");

    // Push Notifications Logic
    if (newGigs > 0) {
        await sendPushNotification(
            "New Gigs Alert! 💼", 
            `We just found ${newGigs} new AV opportunities in New Orleans. Check them out!`,
            { screen: 'gigs' }
        );
    } else if (newEvents > 0) {
        await sendPushNotification(
            "New Events Added! 📅", 
            `${newEvents} new events were just added to the calendar.`,
            { screen: 'calendar' }
        );
    } else if (newNews > 0) {
        await sendPushNotification(
            "Industry News Update 📰", 
            `${newNews} new articles have been transmitted.`,
            { screen: 'index' }
        );
    }
}

run().catch(console.error);
