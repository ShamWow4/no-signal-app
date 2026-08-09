import fs from 'fs';

(async () => {
    console.log("Fetching MCCNO events JSON...");
    const response = await fetch('https://mccno.com/wp-content/uploads/events_json/full_calendar_json.json');
    const events = await response.json();
    
    console.log(`Found ${events.length} events in JSON! Formatting to TSV...`);
    
    const header = ['Title', 'Venue', 'loadIn', 'loadOut', 'City'].join('\t') + '\n';
    
    const rows = events.map(e => {
        const title = e.title ? e.title.replace(/\s+/g, ' ') : '';
        const venue = e.venue ? e.venue.replace(/\s+/g, ' ') : 'MCCNO';
        
        // Extract start and end directly from the JSON dates
        // e.startDT or e.start look like "2026-07-16T00:00:00"
        const loadIn = e.startDT || e.start || '';
        const loadOut = e.endDT || e.end || '';
        
        const city = 'NEW ORLEANS, LA';
        
        return `${title}\t${venue}\t${loadIn}\t${loadOut}\t${city}`;
    }).join('\n');
    
    fs.writeFileSync('mccno_events.tsv', header + rows);
    console.log(`Done! Exported to mccno_events.tsv`);
})();
