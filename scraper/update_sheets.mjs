import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveFile(fileName) {
    if (!fileName) return null;
    if (fs.existsSync(fileName)) return fileName;
    const inDir = path.join(__dirname, fileName);
    if (fs.existsSync(inDir)) return inDir;
    const inScraper = path.join(__dirname, '../scraper', fileName);
    if (fs.existsSync(inScraper)) return inScraper;
    return null;
}

// Permanent Master Spreadsheet ID (Option 1)
const SPREADSHEET_ID = '1q3UNaTuyHbJ630R8UPZyxcGow00HQGaaRZ6YiSOEB1A';
const CREDENTIALS_PATH = resolveFile('google-credentials.json') || resolveFile('serviceAccountKey.json') || resolveFile('../serviceAccountKey.json');

/**
 * Normalizes dates to standard YYYY-MM-DD
 */
function parseToISODate(dateStr) {
    if (!dateStr) return '';
    dateStr = dateStr.toString().trim();
    
    // Match YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

    // Match MM/DD/YYYY or M/D/YYYY
    const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mmddyyyy) {
        const m = mmddyyyy[1].padStart(2, '0');
        const d = mmddyyyy[2].padStart(2, '0');
        const y = mmddyyyy[3];
        return `${y}-${m}-${d}`;
    }

    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }
    return dateStr;
}

function normalizeKey(str) {
    return str ? str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '') : '';
}

async function ensureTabExists(sheets, preferredNames) {
    try {
        const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const existingSheets = res.data.sheets.map(s => s.properties.title);
        
        for (const pref of preferredNames) {
            const found = existingSheets.find(s => s.toLowerCase().trim() === pref.toLowerCase().trim());
            if (found) return found;
        }

        const newTabName = preferredNames[0];
        console.log(`➕ Tab '${newTabName}' not found. Creating tab in Google Sheets...`);
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    addSheet: {
                        properties: { title: newTabName }
                    }
                }]
            }
        });
        console.log(`✨ Created new tab '${newTabName}'!`);
        return newTabName;
    } catch (e) {
        return preferredNames[0];
    }
}

async function pushRowsToSheet(sheets, preferredTabNames, rows) {
    if (!rows || rows.length <= 1) {
        console.log(`ℹ️  No data to push for '${preferredTabNames[0]}'.`);
        return;
    }

    try {
        const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const existingSheets = res.data.sheets.map(s => s.properties.title);
        
        const matchingTabs = [];
        for (const pref of preferredTabNames) {
            const found = existingSheets.find(s => s.toLowerCase().trim() === pref.toLowerCase().trim());
            if (found && !matchingTabs.includes(found)) {
                matchingTabs.push(found);
            }
        }

        if (matchingTabs.length === 0) {
            const createdTab = await ensureTabExists(sheets, preferredTabNames);
            matchingTabs.push(createdTab);
        }

        for (const targetTab of matchingTabs) {
            console.log(`▶ Pushing ${rows.length - 1} rows to tab '${targetTab}'...`);
            await sheets.spreadsheets.values.clear({
                spreadsheetId: SPREADSHEET_ID,
                range: `'${targetTab}'!A:Z`,
            });
            
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `'${targetTab}'!A1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: rows
                }
            });
            console.log(`✅ Success! '${targetTab}' tab updated.`);
        }
    } catch (err) {
        console.error(`❌ Failed to update sheet tabs (${preferredTabNames.join(', ')}):`, err.message);
    }
}

async function pushDataToSheet(sheets, preferredTabNames, fileName) {
    const resolved = resolveFile(fileName);
    if (!resolved) {
        console.log(`Could not read ${fileName}. Skipping.`);
        return;
    }

    const data = fs.readFileSync(resolved, 'utf-8');
    const rows = data.trim().split('\n').map(r => r.split('\t')).filter(r => r.length > 1);
    
    if (rows.length === 0) {
        console.log(`No data found in ${fileName} to push.`);
        return;
    }

    await pushRowsToSheet(sheets, preferredTabNames, rows);
}

async function updateSheets() {
    console.log("====================================================");
    console.log("📊 STANDARDIZED GOOGLE SHEETS PIPELINE STARTED 📊");
    console.log("====================================================\n");
    
    if (!CREDENTIALS_PATH || !fs.existsSync(CREDENTIALS_PATH)) {
        console.error(`Error: Credentials file not found at ${CREDENTIALS_PATH}`);
        return;
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Standard 7-Column Master Calendar Schema
    const calendarHeader = ['Title', 'Venue', 'Hall / Room', 'Load-In Date', 'Load-Out Date', 'City', 'Source'];
    const seenEvents = new Set();
    const masterRows = [calendarHeader];
    const nomccRows = [calendarHeader];
    const hotelRows = [calendarHeader];

    // 1. Process NOMCC Convention Events
    const mccnoFile = resolveFile('mccno_events.tsv');
    if (mccnoFile) {
        const rawMccno = fs.readFileSync(mccnoFile, 'utf-8').trim().split('\n').map(r => r.split('\t')).filter(r => r.length > 1);
        if (rawMccno.length > 0 && rawMccno[0][0] === 'Title') rawMccno.shift();
        
        for (const row of rawMccno) {
            const title = row[0] || '';
            const key = normalizeKey(title);
            
            if (key && !seenEvents.has(key)) {
                seenEvents.add(key);
                const loadIn = parseToISODate(row[2] || '');
                const loadOut = parseToISODate(row[3] || row[2] || '');
                const city = row[4] || 'NEW ORLEANS, LA';
                const hall = row[5] || '';

                const eventRow = [title, 'NOMCC', hall, loadIn, loadOut, city, 'NOMCC Portal'];
                masterRows.push(eventRow);
                nomccRows.push(eventRow);
            }
        }
    }

    // 2. Process Hotel / Encore Events
    const encoreFile = resolveFile('new_orleans_events.tsv');
    if (encoreFile) {
        const rawEncore = fs.readFileSync(encoreFile, 'utf-8').trim().split('\n').map(r => r.split('\t')).filter(r => r.length > 1);
        if (rawEncore.length > 0 && rawEncore[0][0] === 'Title') rawEncore.shift();
        
        for (const row of rawEncore) {
            let title = (row[0] || '').replace(/\s*-\s*Exhibit Ordering$/i, '').trim();
            const key = normalizeKey(title);
            
            if (key && !seenEvents.has(key)) {
                seenEvents.add(key);
                const venue = row[1] || 'NEW ORLEANS HOTEL';
                
                let loadIn = '';
                let loadOut = '';
                let city = 'NEW ORLEANS, LA';

                if (row.length >= 5) {
                    loadIn = parseToISODate(row[2] || '');
                    loadOut = parseToISODate(row[3] || '');
                    city = row[4] || 'NEW ORLEANS, LA';
                } else {
                    let datesStr = row[2] || '';
                    const dateMatches = datesStr.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g);
                    if (dateMatches && dateMatches.length >= 2) {
                        loadIn = parseToISODate(dateMatches[0]);
                        loadOut = parseToISODate(dateMatches[1]);
                    } else if (dateMatches && dateMatches.length === 1) {
                        loadIn = parseToISODate(dateMatches[0]);
                        loadOut = loadIn;
                    } else {
                        loadIn = parseToISODate(datesStr);
                        loadOut = loadIn;
                    }
                    city = row[3] || 'NEW ORLEANS, LA';
                }

                const eventRow = [title, venue, '', loadIn, loadOut, city, 'Encore Hotel Portal'];
                masterRows.push(eventRow);
                hotelRows.push(eventRow);
            }
        }
    }

    // 1. Push Master Combined Calendar
    await pushRowsToSheet(sheets, ['calendar_events', 'Master Calendar', 'Master calendar'], masterRows);

    // 2. Push NOMCC Sub-View Tab
    await pushRowsToSheet(sheets, ['NOMCC'], nomccRows);

    // 3. Push Hotels Sub-View Tab
    await pushRowsToSheet(sheets, ['Hotels'], hotelRows);

    // 4. Push AV News Feed
    await pushDataToSheet(sheets, ['news_feed', 'Newsletter_AV News', 'Newsletter_AV news'], 'av_news.tsv');

    // 5. Push AV Gigs
    await pushDataToSheet(sheets, ['gig_alerts', 'Newsletter_Gigs', 'Newsletter_gigs'], 'av_gigs.tsv');

    // 6. Push AV Directory
    let baselineDir = [];
    const dirFile = resolveFile('av_directory_baseline.tsv');
    if (dirFile) {
        baselineDir = fs.readFileSync(dirFile, 'utf-8').trim().split('\n').map(r => r.split('\t')).filter(r => r.length > 1);
    }
    if (baselineDir.length > 0) {
        const directoryHeader = ['Company Name', 'Website', 'Contact Phone', 'Contact Name', 'Position'];
        if (baselineDir[0][0] === 'Company Name') baselineDir.shift();
        const formattedDir = [directoryHeader, ...baselineDir];
        await pushRowsToSheet(sheets, ['labor_directory', 'Newsletter_AV Directory', 'Newsletter_AV directory'], formattedDir);
    }

    // 7. Push AV Training
    await pushDataToSheet(sheets, ['av_training', 'Newsletter_AV Training'], 'av_training.tsv');

    console.log("\n====================================================");
    console.log("🎉 GOOGLE SHEETS PIPELINE COMPLETE! All Tabs Updated 🎉");
    console.log("====================================================\n");
}

updateSheets();
