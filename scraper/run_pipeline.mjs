import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parallelScrapers = [
    { name: '0. Scraping NOLA Hotel Events', command: 'node scrape_all_encore_nola.mjs' },
    { name: '1. Scraping MCCNO Events', command: 'node scrape_mccno_json.mjs' },
    { name: '2. Scraping AV News', command: 'node scrape_av_news.mjs' },
    { name: '3. Scraping AV Gigs', command: 'node scrape_av_gigs.mjs' },
    { name: '4. Scraping AV Training', command: 'node scrape_av_training.mjs' }
];

const syncSteps = [
    { name: '6. Syncing to Google Sheets', command: 'node update_sheets.mjs' },
    { name: '7. Syncing to Firebase (Live App)', command: 'node syncSheetsToFirebase.mjs' }
];

async function runPipeline() {
    console.log('=============================================');
    console.log('🚀 NO SIGNAL - FAST PARALLEL PIPELINE STARTED 🚀');
    console.log('=============================================\n');

    console.log('⚡ Running scrapers concurrently in parallel...\n');
    const startTime = Date.now();

    const scraperResults = await Promise.allSettled(
        parallelScrapers.map(async (s) => {
            console.log(`▶ Starting ${s.name}...`);
            const { stdout, stderr } = await execAsync(s.command, { cwd: __dirname });
            return { name: s.name, stdout: stdout.trim(), stderr: stderr.trim() };
        })
    );

    for (const res of scraperResults) {
        if (res.status === 'fulfilled') {
            console.log(`\n✅ ${res.value.name} complete:`);
            if (res.value.stdout) console.log(res.value.stdout);
        } else {
            console.error(`\n❌ Error running scraper:`, res.reason);
        }
    }

    console.log('\n=============================================');
    console.log('🔄 Executing Sync Tasks...');
    console.log('=============================================\n');

    for (const step of syncSteps) {
        console.log(`▶ Executing ${step.name}...`);
        try {
            const { stdout } = await execAsync(step.command, { cwd: __dirname });
            console.log(stdout.trim());
        } catch (error) {
            console.error(`❌ Error in ${step.name}:`, error.message);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n=============================================');
    console.log(`✅ PIPELINE COMPLETE! All Data Synced in ${elapsed}s! ✅`);
    console.log('=============================================');
}

runPipeline();

