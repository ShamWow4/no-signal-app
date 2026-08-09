const admin = require("firebase-admin");

try {
    admin.initializeApp();
} catch(e) {}
const db = admin.firestore();

async function run() {
    const drafts = await db.collection('news_drafts').get();
    for (const doc of drafts.docs) {
        await db.collection('news_feed').doc(doc.id).set(doc.data());
    }
    console.log(`Published ${drafts.docs.length} drafts to the live news_feed.`);
}
run();
