import fs from 'fs';

(async () => {
    console.log("Fetching MCCNO events JSON...");
    const response = await fetch('https://mccno.com/wp-content/uploads/events_json/full_calendar_json.json');
    const events = await response.json();
    
    console.log(`Found ${events.length} events in JSON! Formatting to TSV...`);
    
    const header = ['Title', 'Venue', 'Dates', 'City'].join('\t') + '\n';
    
    const rows = events.map(e => {
        const title = e.title ? e.title.replace(/\s+/g, ' ') : '';
        const venue = e.venue ? e.venue.replace(/\s+/g, ' ') : 'MCCNO';
        
        let startStr = '';
        if (e.startDT || e.start) {
            const startDate = new Date(e.startDT || e.start);
            startStr = startDate.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'});
        }
        
        let endStr = '';
        if (e.endDT || e.end) {
            const endDate = new Date(e.endDT || e.end);
            endStr = endDate.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'});
        }
        
        const dates = `${startStr} - ${endStr}`;
        const city = 'NEW ORLEANS, LA';
        
        return `${title}\t${venue}\t${dates}\t${city}`;
    }).join('\n');
    
    fs.writeFileSync('mccno_events.tsv', header + rows);
    console.log(`Done! Exported to mccno_events.tsv`);
})();
