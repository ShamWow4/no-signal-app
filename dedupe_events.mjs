import fs from 'fs';

const data = JSON.parse(fs.readFileSync('all_scraped_events.json', 'utf8'));
const uniqueEventsMap = new Map();

for (const event of data) {
  const key = `${event.name}-${event.loadIn}`;
  if (!uniqueEventsMap.has(key)) {
    uniqueEventsMap.set(key, event);
  }
}

const uniqueEvents = Array.from(uniqueEventsMap.values());
fs.writeFileSync('all_scraped_events.json', JSON.stringify(uniqueEvents, null, 2));

console.log(`Deduplication complete. Removed ${data.length - uniqueEvents.length} duplicate events.`);
console.log(`Final count: ${uniqueEvents.length} unique events.`);
