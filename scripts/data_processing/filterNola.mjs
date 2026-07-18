import fs from 'fs';

const data = JSON.parse(fs.readFileSync('all_scraped_events.json', 'utf8'));
const uniqueEventsMap = new Map();

let nolaCount = 0;
for (const dataItem of data) {
  const isNola = (dataItem.venue && dataItem.venue.toLowerCase().includes('new orleans')) || 
                 (dataItem.hall && dataItem.hall.toLowerCase().includes('new orleans')) ||
                 (dataItem.hall && dataItem.hall.toLowerCase().includes(' la')) ||
                 (dataItem.venue && dataItem.venue.toLowerCase().includes('morial'));
                 
  if (isNola) {
    let newVenueName = dataItem.venue;
    if (dataItem.venue.includes('Hyatt Regency')) newVenueName = 'Hyatt Regency';
    else if (dataItem.venue.includes('Hilton')) newVenueName = 'Hilton Riverside';
    else if (dataItem.venue.includes('Sheraton')) newVenueName = 'Sheraton New Orleans';
    else if (dataItem.venue.includes('Marriott')) newVenueName = 'Marriott';
    else if (dataItem.venue.includes('Morial') || dataItem.venue.includes('NOMCC')) newVenueName = 'NOMCC';
    
    dataItem.venue = newVenueName;
    nolaCount++;
    
    const key = `${dataItem.name}-${dataItem.loadIn}`;
    if (!uniqueEventsMap.has(key)) {
      uniqueEventsMap.set(key, dataItem);
    }
  }
}

const uniqueEvents = Array.from(uniqueEventsMap.values());
fs.writeFileSync('nola_events.json', JSON.stringify(uniqueEvents, null, 2));

console.log(`Parsed ${data.length} total events.`);
console.log(`Found ${nolaCount} NOLA events.`);
console.log(`After deduplication, wrote ${uniqueEvents.length} unique NOLA events to nola_events.json.`);
