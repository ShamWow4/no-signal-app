import fs from 'fs';

(async () => {
    console.log("Fetching MCCNO events JSON...");
    const response = await fetch('https://mccno.com/wp-content/uploads/events_json/full_calendar_json.json');
    const events = await response.json();
    
    console.log(`Found ${events.length} raw event entries in JSON! Deduplicating & formatting...`);
    
    const uniqueEventsMap = new Map();
    
    for (const e of events) {
        if (!e.title) continue;
        const cleanTitle = e.title.trim().replace(/\s+/g, ' ');
        const normKey = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const loadIn = e.startDT || e.start || '';
        const loadOut = e.endDT || e.end || '';
        const rawHall = e.venue ? e.venue.trim().replace(/\s+/g, ' ') : '';
        const venue = 'NOMCC';

        if (uniqueEventsMap.has(normKey)) {
            const existing = uniqueEventsMap.get(normKey);
            // Combine venue halls if different
            if (rawHall && !existing.hall.includes(rawHall)) {
                existing.hall = `${existing.hall}, ${rawHall}`;
            }
        } else {
            uniqueEventsMap.set(normKey, {
                title: cleanTitle,
                venue,
                hall: rawHall,
                loadIn,
                loadOut,
                city: 'NEW ORLEANS, LA'
            });
        }
    }
    
    const uniqueEvents = Array.from(uniqueEventsMap.values());
    console.log(`Deduplicated to ${uniqueEvents.length} unique events.`);
    
    const header = ['Title', 'Venue', 'loadIn', 'loadOut', 'City', 'hall'].join('\t') + '\n';
    const rows = uniqueEvents.map(e => `${e.title}\t${e.venue}\t${e.loadIn}\t${e.loadOut}\t${e.city}\t${e.hall}`).join('\n');
    
    fs.writeFileSync('mccno_events.tsv', header + rows);
    console.log(`Done! Saved ${uniqueEvents.length} clean events to mccno_events.tsv`);
})();
