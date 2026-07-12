import { execSync } from 'child_process';

const scripts = [
    { name: '1. Scraping MCCNO Events', command: 'node scrape_mccno_json.mjs' },
    { name: '2. Scraping AV News', command: 'node scrape_av_news.mjs' },
    { name: '3. Scraping AV Gigs', command: 'node scrape_av_gigs.mjs' },
    { name: '4. Scraping AV Directory', command: 'node scrape_av_directory.mjs' },
    { name: '5. Scraping AV Training', command: 'node scrape_av_training.mjs' },
    { name: '6. Syncing to Google Sheets', command: 'node update_sheets.mjs' },
    { name: '7. Syncing to Firebase (Live App)', command: 'node pushToFirebase.mjs' }
];

console.log('=============================================');
console.log('🚀 NO SIGNAL - MASTER DATA PIPELINE STARTED 🚀');
console.log('=============================================\n');

for (const script of scripts) {
    console.log(`\n▶ ${script.name}...`);
    try {
        // execute synchronously, streaming output to the terminal
        execSync(script.command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`\n❌ Error running ${script.name}. Stopping pipeline.`);
        process.exit(1);
    }
}

console.log('\n=============================================');
console.log('✅ PIPELINE COMPLETE! All Data Synced! ✅');
console.log('=============================================');
