import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.FIRECRAWL_API_KEY || "fc-5308d0d6ba954d18adae9c4996e1ab94";

async function firecrawlSearch(query) {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ query })
    });
    return response.json();
}

async function scrapeWithFirecrawl(url, prompt, schema) {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            url: url,
            formats: ['extract'],
            extract: { prompt, schema }
        })
    });
    return response.json();
}

async function buildDirectory() {
    console.log("Loading baseline directory...");
    const baselineRaw = fs.readFileSync('av_directory_baseline.tsv', 'utf-8');
    const baselineRows = baselineRaw.trim().split('\n').map(r => r.split('\t'));
    
    const existingCompanies = new Set(baselineRows.slice(1).map(r => r[0].trim().toLowerCase()));

    const queries = [
        "Audio visual labor companies New Orleans list",
        "Audio Visual production companies New Orleans"
    ];

    let newUrlsToScrape = new Set();
    
    for (const query of queries) {
        console.log(`Searching for: ${query}`);
        const searchResult = await firecrawlSearch(query);
        if (searchResult.success && searchResult.data) {
            for (const item of searchResult.data) {
                const url = item.url.toLowerCase();
                // Skip generic job boards and directories that are too broad
                if (!url.includes('indeed.com') && 
                    !url.includes('ziprecruiter.com') && 
                    !url.includes('yelp.com') &&
                    !url.includes('glassdoor.com')) {
                    newUrlsToScrape.add(item.url);
                }
            }
        }
    }

    const urls = Array.from(newUrlsToScrape).slice(0, 5); // Limit to top 5 to save time and API calls
    console.log(`Found ${urls.length} potential company URLs to scrape.`);

    const schema = {
        type: 'object',
        properties: {
            companies: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        website: { type: 'string' },
                        phone: { type: 'string' },
                        contactName: { type: 'string' },
                        position: { type: 'string' }
                    },
                    required: ['name']
                }
            }
        }
    };

    let newCompanies = [];

    for (const url of urls) {
        console.log(`Extracting company info from: ${url}`);
        try {
            const data = await scrapeWithFirecrawl(url, "Extract any Audio Visual labor or production companies mentioned on this page. Include their name, website, phone, primary contact person name, and contact's position if available.", schema);
            
            if (data && data.success && data.data && data.data.extract && data.data.extract.companies) {
                for (const comp of data.data.extract.companies) {
                    const compNameLower = (comp.name || '').toLowerCase();
                    if (compNameLower && !existingCompanies.has(compNameLower)) {
                        newCompanies.push(comp);
                        existingCompanies.add(compNameLower);
                    }
                }
            }
        } catch(e) {
            console.error(`Failed to extract from ${url}:`, e.message);
        }
    }

    if (newCompanies.length > 0) {
        const rows = newCompanies.map(c => {
            return `${c.name || ''}\t${c.website || ''}\t${c.phone || ''}\t${c.contactName || ''}\t${c.position || ''}`;
        }).join('\n');
        
        fs.writeFileSync('av_directory_new.tsv', 'Company Name\tCompany Website\tContact phone number\tContact Name\tPosition\n' + rows);
        console.log(`Saved ${newCompanies.length} NEW companies to av_directory_new.tsv`);
    } else {
        console.log("No new companies found.");
    }
}

buildDirectory();
