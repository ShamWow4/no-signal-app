const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require('../serviceAccountKey.json'))
    });
}
const db = admin.firestore();

async function listBlanks() {
    const snapshot = await db.collection('labor_directory').get();
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.phone || !data.website) {
            console.log(`[${doc.id}] ${data.name}: Phone=${data.phone} Website=${data.website}`);
        }
    });
}
listBlanks();
