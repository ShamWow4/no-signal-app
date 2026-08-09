import fs from 'fs';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1q3UNaTuyHbJ630R8UPZyxcGow00HQGaaRZ6YiSOEB1A';
const CREDENTIALS_PATH = 'google-credentials.json';

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
    
    // 1. Combine Encore and MCCNO and push to Sheet1 (Event Calendar)
    let encoreRows = [];
    let mccnoRows = [];
    if (fs.existsSync('new_orleans_events.tsv')) {
        encoreRows = fs.readFileSync('new_orleans_events.tsv', 'utf-8').trim().split('\n').map(r => r.split('\t')).filter(r => r.length > 1);
    }
    if (fs.existsSync('mccno_events.tsv')) {
        mccnoRows = fs.readFileSync('mccno_events.tsv', 'utf-8').trim().split('\n').map(r => r.split('\t')).filter(r => r.length > 1);
        if (mccnoRows.length > 0 && mccnoRows[0][0] === 'Title') mccnoRows.shift();
    }
    
    const allEventRows = [...encoreRows, ...mccnoRows];
    if (allEventRows.length > 0) {
        console.log(`Pushing ${allEventRows.length} rows to calendar_events...`);
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
    
    const allDirectoryRows = [...baselineDir, ...newDir];
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
