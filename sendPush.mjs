import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function sendPushNotification() {
  const args = process.argv.slice(2);
  const title = args[0] || "No Signal! Alert";
  const body = args[1] || "A new update has been posted in the app.";

  console.log(`Preparing to send: "${title}" - "${body}"`);

  // Fetch all tokens from Firebase
  const tokensSnapshot = await db.collection('push_tokens').get();
  
  if (tokensSnapshot.empty) {
    console.log("No push tokens found in the database. No users are registered.");
    return;
  }

  const messages = [];
  let userCount = 0;

  tokensSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.token) {
      messages.push({
        to: data.token,
        sound: 'default',
        title: title,
        body: body,
        data: { someData: 'goes here' },
      });
      userCount++;
    }
  });

  console.log(`Sending to ${userCount} devices...`);

  // Send to Expo Push API
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    
    const data = await response.json();
    console.log("Expo Push API Response:");
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

sendPushNotification().catch(console.error);
