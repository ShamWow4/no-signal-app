// Removed dotenv
const axios = require('axios');
const admin = require('firebase-admin');

// Ensure firebase isn't initialized twice if we run multiple times
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require('../serviceAccountKey.json'))
    });
}
const db = admin.firestore();

async function findMoreCompanies() {
    console.log("Searching for more AV companies via Firecrawl...");
    try {
        const response = await axios.post('https://api.firecrawl.dev/v1/scrape', {
            url: "https://www.yelp.com/search?find_desc=Audio+Visual+Equipment+Rental&find_loc=New+Orleans%2C+LA",
            formats: ["extract"],
            extract: {
                prompt: "Extract a list of audio visual, production, and event labor companies from the page. Exclude companies that only do DJ services or weddings.",
                schema: {
                    type: "object",
                    properties: {
                        companies: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    type: { type: "string" },
                                    phone: { type: "string" },
                                    website: { type: "string" }
                                },
                                required: ["name"]
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
        
        const newCompanies = response.data.data.extract.companies;
        console.log(`Found ${newCompanies.length} companies. Checking for duplicates...`);
        
        const directoryRef = db.collection('labor_directory');
        let addedCount = 0;
        
        for (const company of newCompanies) {
            const snapshot = await directoryRef.where('name', '==', company.name).get();
            if (snapshot.empty) {
                await directoryRef.add(company);
                addedCount++;
                console.log(`+ Added new company: ${company.name}`);
            } else {
                console.log(`- Skipped existing: ${company.name}`);
            }
        }
        console.log(`Successfully added ${addedCount} new companies to the directory.`);
    } catch(e) {
        console.error(e.response ? e.response.data : e.message);
    }
}

findMoreCompanies();
