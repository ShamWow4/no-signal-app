// removed dotenv
const axios = require('axios');

async function testScrape() {
    console.log("Testing Firecrawl on MCCNO Events...");
    try {
        const response = await axios.post('https://api.firecrawl.dev/v1/scrape', {
            url: "https://mccno.com/events/",
            formats: ["extract"],
            extract: {
                prompt: "Extract upcoming conventions, tradeshows, meetings, and events. You MUST classify the venue to strictly one of these exact strings: 'NOMCC', 'Hyatt Regency', 'Sheraton New Orleans', 'Hilton Riverside', or 'Marriott'. Format dates in ISO 8601 (YYYY-MM-DD).",
                schema: {
                    type: "object",
                    properties: {
                        events: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    loadIn: { type: "string" },
                                    loadOut: { type: "string" },
                                    venue: { type: "string" },
                                }
                            }
                        }
                    }
                }
            }
        }, {
            headers: {
                'Authorization': `Bearer fc-5308d0d6ba954d18adae9c4996e1ab94`,
                'Content-Type': 'application/json'
            }
        });
        console.log(JSON.stringify(response.data.data.extract.events, null, 2));
    } catch(e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
testScrape();
