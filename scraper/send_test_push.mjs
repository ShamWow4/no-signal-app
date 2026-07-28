import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ACCOUNT_PATH = fs.existsSync(path.join(__dirname, 'serviceAccountKey.json'))
    ? path.join(__dirname, 'serviceAccountKey.json')
    : path.join(__dirname, '../serviceAccountKey.json');

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function sendTestPush() {
    console.log('🔔 Sending Test Push Notification to all registered app devices...');
    
    const tokensSnapshot = await db.collection('push_tokens').get();
    if (tokensSnapshot.empty) {
        console.log('❌ No push token devices found in Firestore collection "push_tokens". Open the app on your phone to register your device!');
        return;
    }

    const tokens = tokensSnapshot.docs
        .map(d => d.data().token)
        .filter(t => typeof t === 'string' && t.startsWith('ExpoPushToken['));

    console.log(`Found ${tokens.length} registered device token(s):`, tokens);

    if (tokens.length === 0) {
        console.log('❌ No valid ExpoPushToken strings found.');
        return;
    }

    const messages = tokens.map(token => ({
        to: token,
        sound: 'default',
        title: '🚨 Test Gig Alert: Audio Technician',
        body: 'Morial Convention Center • Hall B • New Orleans, LA',
        data: { screen: 'gigs' }
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('✅ Push Notification Result:', JSON.stringify(result, null, 2));
}

sendTestPush();
