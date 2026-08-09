const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require('../serviceAccountKey.json'))
    });
}
const db = admin.firestore();

async function updateMissing() {
    console.log("Updating missing data...");
    const batch = db.batch();
    
    // Crescent Sound & Light
    batch.update(db.collection('labor_directory').doc('QiTHXV3bPfNQ35GEbXpt'), { phone: '504-465-8583' });
    
    // ASM Global
    batch.update(db.collection('labor_directory').doc('EXHwOK8Mh2aeWCwA79al'), { phone: '504-587-3663' });

    await batch.commit();
    console.log("Updated ASM Global and Crescent Sound & Light.");
}
updateMissing();
