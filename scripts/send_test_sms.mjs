import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function sendTestSMS(phone, messageText) {
  console.log(`Sending test SMS document to Firestore /messages...`);
  console.log(`Recipient: ${phone}`);
  console.log(`Message: ${messageText}`);
  
  const res = await db.collection('messages').add({
    to: phone,
    body: messageText,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log(`✅ Success! Created document ID: ${res.id} in /messages collection.`);
  console.log(`🚀 Firebase Cloud Function (no-signal-sms:sendTwilioMessage) will now trigger and send the text via Twilio!`);
  process.exit(0);
}

const phone = process.argv[2];
const message = process.argv[3] || 'Hello from No Signal App!';

if (!phone) {
  console.error('Error: Please provide a target phone number.');
  console.log('Usage: node ./scripts/send_test_sms.mjs +15045551234 "Your message here"');
  process.exit(1);
}

sendTestSMS(phone, message);
