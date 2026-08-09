const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require('../serviceAccountKey.json'))
    });
}
const db = admin.firestore();

async function checkBlanks() {
    const snapshot = await db.collection('labor_directory').get();
    let missingPhone = 0;
    let missingWebsite = 0;
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.phone) missingPhone++;
        if (!data.website) missingWebsite++;
    });
    
    console.log(`Total companies: ${snapshot.size}`);
    console.log(`Missing phone: ${missingPhone}`);
    console.log(`Missing website: ${missingWebsite}`);
}

checkBlanks();
