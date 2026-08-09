import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Sends a single SMS via Firestore Cloud Function trigger.
 * @param {string} to - Destination phone number (e.g., "5045550199" or "+15045550199")
 * @param {string} body - SMS message content
 * @returns {Promise<string>} Document ID of the created message
 */
export async function sendSmsNotification(to, body) {
  if (!to || !body) {
    throw new Error('Destination phone number and message body are required.');
  }

  const docRef = await addDoc(collection(db, 'messages'), {
    to: to.trim(),
    body: body.trim(),
    createdAt: serverTimestamp(),
    status: 'PENDING'
  });

  return docRef.id;
}

/**
 * Broadcasts an SMS message to a list of technicians.
 * @param {Array<{phone: string, name?: string}>} recipients - Array of technician objects with phone numbers
 * @param {string} messageTemplate - Template string (can use {{name}} placeholder)
 * @returns {Promise<number>} Count of queued messages
 */
export async function broadcastSms(recipients, messageTemplate) {
  if (!recipients || !recipients.length || !messageTemplate) {
    throw new Error('Recipients list and message template are required.');
  }

  let count = 0;
  for (const tech of recipients) {
    if (!tech.phone) continue;
    const personalizedBody = messageTemplate.replace(/\{\{name\}\}/g, tech.name || 'Technician');
    await sendSmsNotification(tech.phone, personalizedBody);
    count++;
  }

  return count;
}
