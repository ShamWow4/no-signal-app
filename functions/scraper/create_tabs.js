import fs from 'fs';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1q3UNaTuyHbJ630R8UPZyxcGow00HQGaaRZ6YiSOEB1A';
const CREDENTIALS_PATH = 'google-credentials.json';

async function createTabs() {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    try {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    { addSheet: { properties: { title: 'labor_directory' } } },
                    { addSheet: { properties: { title: 'av_training' } } }
                ]
            }
        });
        console.log("Successfully created missing tabs!");
    } catch (e) {
        console.error("Failed to create tabs (they might already exist):", e.message);
    }
}
createTabs();
