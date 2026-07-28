import fs from 'fs';

function normalizeText(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, '&')
    .replace(/[^a-z0-9]/g, '');
}

function parseDateStr(str) {
  if (!str) return '';
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return str.toString().replace(/[^0-9]/g, '');
}

function getEventKey(event) {
  const title = normalizeText(event.name || event.Title || '');
  const venue = normalizeText(event.venue || event.Venue || '');
  const loadIn = parseDateStr(event.loadIn || event['Load In'] || event['Show Start'] || event['Dates'] || '');
  const loadOut = parseDateStr(event.loadOut || event['Load Out'] || event['Show End'] || '');
  return `${title}|${venue}|${loadIn}|${loadOut}`;
}

const data = JSON.parse(fs.readFileSync('all_scraped_events.json', 'utf8'));

const uniqueEvents = [];
const seen = new Set();

for (const event of data) {
  const key = getEventKey(event);
  if (key.replace(/\|/g, '') === '') continue;
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

