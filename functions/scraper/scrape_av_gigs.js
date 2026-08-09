import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FIRECRAWL_API_KEY || "fc-5308d0d6ba954d18adae9c4996e1ab94";

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
            extract: {
                prompt: prompt,
                schema: schema
            }
        })
    });
    return response.json();
}

async function scrapeGigs() {
    const urls = [
        'https://www.ziprecruiter.com/jobs-search?search=Audio+Visual&location=New+Orleans%2C+LA',
        'https://www.indeed.com/jobs?q=Audio+Visual&l=New+Orleans%2C+LA'
    ];
    
    const schema = {
        type: 'object',
        properties: {
            jobs: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        company: { type: 'string' },
                        location: { type: 'string' },
                        link: { type: 'string' }
                    },
                    required: ['title', 'company', 'location', 'link']
                }
            }
        }
    };

    let allGigs = [];
    
    for (const url of urls) {
        console.log(`Scraping jobs from ${url}...`);
        try {
            const data = await scrapeWithFirecrawl(url, 'Extract the list of job postings for Audio Visual positions in New Orleans. Return the job title, company name, location, and the direct URL link to apply or view the job.', schema);
            
            if (data && data.success && data.data && data.data.extract && data.data.extract.jobs) {
                const jobs = data.data.extract.jobs.map(j => ({...j, source: url.includes('indeed') ? 'Indeed' : 'ZipRecruiter'}));
                allGigs.push(...jobs);
            } else {
                console.log(`Could not extract from ${url}:`, JSON.stringify(data).substring(0, 500));
            }
        } catch(e) {
            console.error(`Failed to scrape ${url}:`, e.message);
        }
    }
    
    const header = ['Job Title', 'Company', 'Location', 'Link', 'Source'].join('\t') + '\n';
    const rows = allGigs.map(j => {
        const title = (j.title || '').replace(/\t|\n/g, ' ');
        const company = (j.company || '').replace(/\t|\n/g, ' ');
        const location = (j.location || '').replace(/\t|\n/g, ' ');
        const link = (j.link || '').replace(/\t|\n/g, ' ');
        return `${title}\t${company}\t${location}\t${link}\t${j.source}`;
    }).join('\n');
    
    fs.writeFileSync('av_gigs.tsv', header + rows);
    console.log(`Saved ${allGigs.length} job postings to av_gigs.tsv`);
}

scrapeGigs();
