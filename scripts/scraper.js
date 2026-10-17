const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function scrapeVenues() {
  const events = [];

  try {
    const url = 'https://mccno.com/events/';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);

    // MCCNO lists events in articles or list items with titles and dates
    // Let's parse text content or headers matching event structures
    $('h3, h4, .event-title, article').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 5 && text.length < 100) {
        events.push({
          id: `event-${Date.now()}-${i}`,
          title: text,
          venue: 'NOMCC',
          date: '2026-10-16', // default fallback date
          scrapedAt: new Date().toISOString()
        });
      }
    });

    // Deduplicate titles
    const uniqueEvents = Array.from(new Set(events.map(e => e.title)))
      .map(title => events.find(e => e.title === title));

    const outputPath = path.join(__dirname, '../src/data/events.json');
    fs.writeFileSync(outputPath, JSON.stringify(uniqueEvents, null, 2));
    console.log(`Successfully scraped and saved ${uniqueEvents.length} events!`);

  } catch (error) {
    console.error('Error scraping venues:', error.message);
    process.exit(1);
  }
}

scrapeVenuous = scrapeVenues();
scrapeVenues();
