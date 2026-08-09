const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const serviceAccount = require('../serviceAccountKey.json');

const SPREADSHEET_ID = "1G1FENjoI-CZmKzqbTWWHEfRJ9Q8FkP8379clSpFR2Xg";

async function checkSheet() {
    try {
        const serviceAccountAuth = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        
        console.log(`Successfully accessed sheet: ${doc.title}`);
        console.log(`Tabs found:`);
        Object.values(doc.sheetsById).forEach(sheet => {
            console.log(`- ${sheet.title} (ID: ${sheet.sheetId})`);
        });
    } catch (error) {
        console.error("Error accessing sheet:", error.message);
    }
}

checkSheet();
