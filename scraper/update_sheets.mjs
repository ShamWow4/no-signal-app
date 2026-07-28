import fs from 'fs';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1q3UNaTuyHbJ630R8UPZyxcGow00HQGaaRZ6YiSOEB1A';
const CREDENTIALS_PATH = fs.existsSync('google-credentials.json') 
    ? 'google-credentials.json' 
    : (fs.existsSync('serviceAccountKey.json') ? 'serviceAccountKey.json' : '../serviceAccountKey.json');


async function pushDataToSheet(sheets, tabName, filePath, columnsCount) {
    if (!fs.existsSync(filePath)) {
        console.log(`Could not read ${filePath}. Skipping.`);
        return;
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    const rows = data.trim().split('\n').map(r => r.split('\t')).filter(r => r.length > 1);
    
    if (rows.length === 0) {
        console.log(`No data found in ${filePath} to push.`);
        return;
    }

    console.log(`Pushing ${rows.length} rows to ${tabName}...`);
    
    try {
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${tabName}'!A:Z`,
        });
        
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${tabName}'!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: rows
            }
        });
        console.log(`Success! ${tabName} updated.`);
    } catch (err) {
        console.error(`Failed to update ${tabName}. Does the tab exist and is the service account an Editor?`);
        console.error("Error details:", err.message);
    }
}

async function updateSheets() {
    console.log("Authenticating with Google Sheets...");
    
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error(`Error: Credentials file not found at ${CREDENTIALS_PATH}`);
        return;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    // Helper for normalization
    const normalizeText = (str) => str ? str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '') : '';

    // 1. Clean & combine MCCNO and Hotel/Encore events with uniform 6-column schema
    const headerRow = ['Title', 'Venue', 'loadIn', 'loadOut', 'City', 'hall'];
    const seenEvents = new Set();
    const allEventRows = [headerRow];

    function parseDatesStr(datesStr) {
        if (!datesStr) return { start: '', end: '' };
        if (datesStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            return { start: datesStr, end: datesStr };
        }
        // Match mm/dd/yyyy or yyyy-mm-dd ranges
        const matches = datesStr.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g);
        if (matches && matches.length >= 2) {
            return { start: matches[0], end: matches[1] };
        } else if (matches && matches.length === 1) {
            return { start: matches[0], end: matches[0] };
        }
        return { start: datesStr, end: datesStr };
    }

    // Process MCCNO rows first (higher priority for convention center events)
    if (fs.existsSync('mccno_events.tsv')) {
        const rawMccno = fs.readFileSync('mccno_events.tsv', 'utf-8').trim().split('\n').map(r => r.split('\t')).filter(r => r.length > 1);
        if (rawMccno.length > 0 && rawMccno[0][0] === 'Title') rawMccno.shift();
        
        for (const row of rawMccno) {
            const title = row[0] || '';
            const titleKey = normalizeText(title);
            if (titleKey && !seenEvents.has(titleKey)) {
                seenEvents.add(titleKey);
                allEventRows.push([
                    title,
                    'NOMCC',
                    row[2] || '',
                    row[3] || row[2] || '',
                    row[4] || 'NEW ORLEANS, LA',
                    row[5] || ''
                ]);
            }
        }
    }

    // Process Hotel / Encore rows second (only add if not already in MCCNO)
    if (fs.existsSync('new_orleans_events.tsv')) {
        const rawEncore = fs.readFileSync('new_orleans_events.tsv', 'utf-8').trim().split('\n').map(r => r.split('\t')).filter(r => r.length > 1);
        if (rawEncore.length > 0 && rawEncore[0][0] === 'Title') rawEncore.shift();
        
        for (const row of rawEncore) {
            let title = row[0] || '';
            // Clean up exhibit ordering suffix if present
            title = title.replace(/\s*-\s*Exhibit Ordering$/i, '').trim();
            const titleKey = normalizeText(title);
            
            if (titleKey && !seenEvents.has(titleKey)) {
                seenEvents.add(titleKey);
                const { start, end } = parseDatesStr(row[2]);
                allEventRows.push([
                    title,
                    row[1] || 'NEW ORLEANS HOTEL',
                    start,
                    end,
                    row[3] || 'NEW ORLEANS, LA',
                    ''
                ]);
            }
        }
    }

    if (allEventRows.length > 1) {
        console.log(`Pushing ${allEventRows.length - 1} deduplicated rows to calendar_events...`);
        try {
            await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: 'calendar_events!A:Z' });
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: 'calendar_events!A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: allEventRows }
            });
            console.log("Success! calendar_events updated.");
        } catch(e) {
            console.error("Failed to update calendar_events:", e.message);
        }
    }

    // 2. Push AV News
    await pushDataToSheet(sheets, 'news_feed', 'av_news.tsv');

    // 3. Push AV Gigs
    await pushDataToSheet(sheets, 'gig_alerts', 'av_gigs.tsv');

    // 4. Push AV Directory
    // Combine baseline and new directory
    let baselineDir = [];
    let newDir = [];
    if (fs.existsSync('av_directory_baseline.tsv')) {
        baselineDir = fs.readFileSync('av_directory_baseline.tsv', 'utf-8').trim().split('\n').map(r => r.split('\t')).filter(r => r.length > 1);
    }
    if (fs.existsSync('av_directory_new.tsv')) {
        newDir = fs.readFileSync('av_directory_new.tsv', 'utf-8').trim().split('\n').map(r => r.split('\t')).filter(r => r.length > 1);
        if (newDir.length > 0 && newDir[0][0] === 'Company Name') newDir.shift();
    }
    
    const rawDirectoryRows = [...baselineDir, ...newDir];
    const allDirectoryRows = rawDirectoryRows.map((row, idx) => {
        if (idx === 0 || row[0] === 'Company Name') return row;
        const copy = [...row];
        let website = copy[1] || '';
        if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
            copy[1] = `https://${website.trim()}`;
        }
        return copy;
    });

    if (allDirectoryRows.length > 0) {
        console.log(`Pushing ${allDirectoryRows.length} rows to labor_directory...`);
        try {
            await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "labor_directory!A:Z" });
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: "labor_directory!A1",
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: allDirectoryRows }
            });
            console.log("Success! labor_directory updated.");
        } catch(e) {
            console.error("Failed to update labor_directory. Does the tab exist?", e.message);
        }
    }
    // 5. Push AV Training
    await pushDataToSheet(sheets, 'av_training', 'av_training.tsv');
}

updateSheets();
