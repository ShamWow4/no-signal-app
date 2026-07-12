import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || "fc-5308d0d6ba954d18adae9c4996e1ab94" });
async function scrapeEvents() {
    console.log("Scraping with Firecrawl...");
    try {
        const response = await app.scrapeUrl('https://eventnow.encoreglobal.com/landingpage/newexhibit/index/', {
            formats: [{
                type: 'json',
                prompt: 'Extract all the upcoming events currently listed on the page. Only extract the events shown.',
                schema: {
                    type: 'object',
                    properties: {
                        events: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string' },
                                    venue: { type: 'string' },
                                    dates: { type: 'string' },
                                    city: { type: 'string' }
                                },
                                required: ['title', 'venue', 'dates', 'city']
                            }
                        }
                    }
                }
            }],
            actions: [
                { type: 'wait', milliseconds: 2000 },
                { type: 'write', text: 'New Orleans', selector: '#searchKeyword' },
                { type: 'click', selector: 'button.search-button' },
                { type: 'wait', milliseconds: 8000 }
            ]
        });

        console.log("Response:", JSON.stringify(response, null, 2));
        fs.writeFileSync('firecrawl_output.json', JSON.stringify(response, null, 2));

    } catch(e) {
        console.error("Error:", e);
    }
}

scrapeEvents();
