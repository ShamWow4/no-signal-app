import fs from 'fs';

const data = JSON.parse(fs.readFileSync('all_scraped_events.json', 'utf8'));

// Find unique events based on name, venue, dates
const uniqueEvents = [];
const seen = new Set();

for (const event of data) {
  const key = `${event.name}|${event.venue}|${event.loadIn}|${event.loadOut}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueEvents.push(event);
  }
}

console.log(`Original count: ${data.length}`);
console.log(`Unique count: ${uniqueEvents.length}`);
console.log(`Duplicates removed: ${data.length - uniqueEvents.length}`);

// Save deduplicated JSON
fs.writeFileSync('all_scraped_events.json', JSON.stringify(uniqueEvents, null, 2));

// Regenerate CSV
const headers = ['Event Name', 'Venue', 'City/Hall', 'Load In', 'Load Out', 'Type', 'URL'];
const escapeCsv = (val) => `"${(val || '').replace(/"/g, '""')}"`;

const csvRows = [headers.map(escapeCsv).join(',')];

for (const event of uniqueEvents) {
  csvRows.push([
    event.name,
    event.venue,
    event.hall,
    event.loadIn,
    event.loadOut,
    event.type,
    event.url
  ].map(escapeCsv).join(','));
}

fs.writeFileSync('all_scraped_events.csv', csvRows.join('\n'));
console.log('✅ Deduplication complete! JSON and CSV updated.');
