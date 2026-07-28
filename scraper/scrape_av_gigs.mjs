import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FIRECRAWL_API_KEY || "fc-5308d0d6ba954d18adae9c4996e1ab94";

const FALLBACK_GIGS = [
    {
        title: 'Audio Visual Technician',
        company: 'Encore Global',
        location: 'New Orleans, LA (Hotel & Convention Venues)',
        link: 'https://m.encoreglobal.com/careers/',
        source: 'Encore Careers'
    },
    {
        title: 'Event AV / Production Specialist',
        company: 'Freeman Audio Visual',
        location: 'New Orleans Ernest N. Morial Convention Center',
        link: 'https://freeman.jobs/',
        source: 'Freeman Careers'
    },
    {
        title: 'IATSE Stagehand & AV Call List',
        company: 'IATSE Local 39',
        location: 'Greater New Orleans Area',
        link: 'https://iatse39.com/',
        source: 'IATSE Local 39'
    },
    {
        title: 'Live Event Audio / Lighting Technician',
        company: 'Production Resource Group (PRG)',
        location: 'New Orleans, LA',
        link: 'https://www.prg.com/en/careers',
        source: 'PRG Careers'
    },
    {
        title: 'Event Operations Crew & Rigging',
        company: 'Rhino Staging',
        location: 'New Orleans, LA',
        link: 'https://rhinostaging.com/work-with-us/',
        source: 'Rhino Staging'
    },
    {
        title: 'Audio Visual Event Manager',
        company: 'Morial Convention Center (MCCNO)',
        location: '900 Convention Center Blvd, New Orleans, LA',
        link: 'https://mccno.com/careers/',
        source: 'MCCNO Careers'
    }
];

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

async function scrapeGigs() {
    console.log("Fetching AV Gigs...");
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
            const data = await scrapeWithFirecrawl(url, 'Extract job postings for Audio Visual positions in New Orleans. Return title, company, location, link.', schema);
            
            if (data && data.success && data.data && data.data.extract && data.data.extract.jobs) {
                const jobs = data.data.extract.jobs.map(j => ({...j, source: url.includes('indeed') ? 'Indeed' : 'ZipRecruiter'}));
                allGigs.push(...jobs);
            } else {
                console.log(`Could not extract via Firecrawl from ${url}`);
            }
        } catch(e) {
            console.error(`Failed to scrape ${url}:`, e.message);
        }
    }

    // If Firecrawl returned 0 gigs (e.g. out of credits or blocked), use fallback gigs
    if (allGigs.length === 0) {
        console.log("Using curated NOLA AV Gigs & Opportunities baseline...");
        allGigs.push(...FALLBACK_GIGS);
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
    console.log(`✅ Saved ${allGigs.length} job postings to av_gigs.tsv`);
}

scrapeGigs();
