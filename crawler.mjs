import FirecrawlApp from '@mendable/firecrawl-js';
import fs from 'fs';

(async () => {
  console.log('Initializing Firecrawl...');
  const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
  
  const allEvents = [];
  let currentPage = 1;
  const MAX_PAGES = 30; // Safety limit
  
  // Define schema for extraction
  const extractSchema = {
    type: "object",
    properties: {
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            venue: { type: "string" },
            hall: { type: "string" },
            loadIn: { type: "string", description: "YYYY-MM-DDTHH:MM" },
            loadOut: { type: "string", description: "YYYY-MM-DDTHH:MM" },
            type: { type: "string", enum: ["Convention"] },
            url: { type: "string", description: "https://eventnow.encoreglobal.com" }
          },
          required: ["name", "venue", "hall", "loadIn", "loadOut", "type", "url"]
        }
      }
    },
    required: ["events"]
  };

  while (currentPage <= MAX_PAGES) {
    const url = `https://eventnow.encoreglobal.com/landingpage/newexhibit/index/?p=${currentPage}`;
    console.log(`\nScraping ${url}...`);
    
    try {
      const response = await app.scrapeUrl(url, {
        formats: [
          {
            type: 'json',
            schema: extractSchema,
            prompt: "Extract the list of upcoming events from the 'Upcoming Events' section. Note that the dates are often combined like '07/01/2026 08:00 am-07/08/2026 06:00 pm', please parse them into loadIn and loadOut. The format must be YYYY-MM-DDTHH:MM. City should map to 'hall', Venue to 'venue'."
          }
        ]
      });

      if (!response.json) {
        console.error(`Failed to extract events for ${url}:`, JSON.stringify(response, null, 2));
        break;
      }

      const events = response.json?.events || [];
      console.log(`Parsed ${events.length} events from page ${currentPage}`);
      
      if (events.length === 0) {
        console.log('No events found on this page. Stopping crawler.');
        break;
      }
      
      allEvents.push(...events);
      currentPage++;
    } catch (e) {
      console.error(`Error during scraping: ${e.message}`);
      break;
    }
  }
  
  fs.writeFileSync('all_scraped_events.json', JSON.stringify(allEvents, null, 2));
  console.log(`\n🎉 Successfully scraped a total of ${allEvents.length} events! Saved to all_scraped_events.json`);
})();
