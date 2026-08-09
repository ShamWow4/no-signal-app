const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const serviceAccount = require('./serviceAccountKey.json');

// Replace this with the actual Spreadsheet ID you get from the URL
const SPREADSHEET_ID = "1q3UNaTuyHbJ630R8UPZyxcGow00HQGaaRZ6YiSOEB1A";

// Initialize auth - see https://theoephraim.github.io/node-google-spreadsheet/#/guides/authentication
const serviceAccountAuth = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
    ],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

let isInitialized = false;

async function initDoc() {
    if (!isInitialized) {
        if (SPREADSHEET_ID === "YOUR_SPREADSHEET_ID_HERE") {
            console.log("Spreadsheet ID not set, skipping Google Sheets sync.");
            return false;
        }
        try {
            await doc.loadInfo();
            isInitialized = true;
        } catch (error) {
            console.error("Failed to load Google Sheet info:", error);
            return false;
        }
    }
    return true;
}

/**
 * Appends a row to a specific sheet by title
 * @param {string} sheetTitle - e.g., 'gig_alerts', 'news_feed', 'calendar_events'
 * @param {object} rowData - Key-value pairs matching column headers
 */
async function appendRow(sheetTitle, rowData) {
    try {
        const canSync = await initDoc();
        if (!canSync) return;

        const sheet = doc.sheetsByTitle[sheetTitle];
        if (!sheet) {
            console.error(`Sheet with title '${sheetTitle}' not found. Make sure you created it.`);
            return;
        }

        // Format dates if they are Firestore timestamps
        const formattedData = { ...rowData };
        if (formattedData.date_discovered && formattedData.date_discovered.toDate) {
            formattedData.date_discovered = formattedData.date_discovered.toDate().toISOString();
        }

        await sheet.addRow(formattedData);
        console.log(`Successfully synced row to Google Sheets: ${sheetTitle}`);
    } catch (error) {
        console.error(`Failed to append row to Google Sheets (${sheetTitle}):`, error);
    }
}

/**
 * Fetches all rows from a specific sheet
 */
async function getSheetData(sheetTitle) {
    try {
        const canSync = await initDoc();
        if (!canSync) return [];

        const sheet = doc.sheetsByTitle[sheetTitle];
        if (!sheet) {
            console.error(`Sheet with title '${sheetTitle}' not found.`);
            return [];
        }

        const rows = await sheet.getRows();
        // Convert to plain objects based on headers
        return rows.map(row => {
            const obj = {};
            sheet.headerValues.forEach(h => {
                obj[h.trim()] = row.get(h) ? row.get(h).trim() : '';
            });
            return obj;
        });
    } catch (error) {
        console.error(`Failed to fetch data from Google Sheets (${sheetTitle}):`, error);
        return [];
    }
}

module.exports = {
    appendRow,
    getSheetData
};
