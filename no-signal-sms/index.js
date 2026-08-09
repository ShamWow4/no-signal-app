const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Normalizes phone numbers to E.164 format (defaults to US +1 if 10 digits).
 */
function formatE164(phone) {
    if (!phone) return null;
    const cleaned = String(phone).replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.length === 10) return `+1${cleaned}`;
    if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
    return `+${cleaned}`;
}

exports.sendTwilioMessage = onDocumentCreated("messages/{docId}", async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
        logger.error("No data associated with the event.");
        return;
    }

    const messageData = snapshot.data();

    // Idempotency check: Skip if already processing or completed
    if (messageData.status === "SUCCESS" || messageData.status === "SENDING") {
        logger.info(`Message ${event.params.docId} already processed or sending. Skipping.`);
        return;
    }

    const to = formatE164(messageData.to);
    const body = messageData.body;

    if (!to || !body) {
        const missingErr = `Missing required fields: ${!messageData.to ? "'to' " : ""}${!body ? "'body'" : ""}`;
        logger.error(missingErr);
        await snapshot.ref.update({
            status: "FAILED",
            error: missingErr,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || "MG903f88346eee4461c8ad7d7141d1876e";

    if (!accountSid || !accountSid.startsWith("AC") || !authToken) {
        const configErr = "Invalid or missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN environment variables.";
        logger.error(configErr);
        await snapshot.ref.update({
            status: "FAILED",
            error: configErr,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
    }

    // Mark as SENDING to prevent double dispatch
    await snapshot.ref.update({
        status: "SENDING",
        formattedTo: to,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    try {
        const client = twilio(accountSid, authToken);

        const message = await client.messages.create({
            body: body,
            messagingServiceSid: messagingServiceSid,
            to: to
        });

        logger.info(`Message successfully sent to ${to}! SID: ${message.sid}`);

        // Write success status and SID back to Firestore
        await snapshot.ref.update({
            status: "SUCCESS",
            twilioSid: message.sid,
            twilioStatus: message.status,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: null
        });
    } catch (error) {
        logger.error(`Twilio API Error for doc ${event.params.docId}: ${error.message}`, error);

        await snapshot.ref.update({
            status: "FAILED",
            error: error.message,
            errorCode: error.code || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});