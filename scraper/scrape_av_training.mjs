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
            extract: { prompt, schema }
        })
    });
    return response.json();
}

async function scrapeTraining() {
    const urls = [
        'https://www.avixa.org/training-section', // AVIXA training
        'https://www.coursera.org/search?query=audio%20visual',
        'https://www.coursera.org/search?query=sound%20engineering',
        'https://www.ui.com/training/',
        'https://www.prosoundtraining.com/?s=free+training'
    ];
    
    const schema = {
        type: 'object',
        properties: {
            courses: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        provider: { type: 'string' },
                        cost: { type: 'string', description: "e.g., 'Free', 'Paid', or specific price" },
                        link: { type: 'string' },
                        description: { type: 'string' }
                    },
                    required: ['title', 'provider', 'cost', 'link']
                }
            }
        }
    };

    let allCourses = [];
    
    for (const url of urls) {
        console.log(`Scraping training from ${url}...`);
        try {
            const data = await scrapeWithFirecrawl(url, 'Extract any Audio/Video or AV industry relevant training courses or certifications. Prioritize extracting free coursework if available, followed by paid content. Include course title, provider, cost (free/paid), link, and a short description.', schema);
            
            if (data && data.success && data.data && data.data.extract && data.data.extract.courses) {
                const courses = data.data.extract.courses.map(c => {
                    return {...c, source_url: url};
                });
                allCourses.push(...courses);
            } else {
                console.log(`Could not extract from ${url}`);
            }
        } catch(e) {
            console.error(`Failed to scrape ${url}:`, e.message);
        }
    }
    
    // Sort so 'Free' comes first
    allCourses.sort((a, b) => {
        const aFree = (a.cost || '').toLowerCase().includes('free');
        const bFree = (b.cost || '').toLowerCase().includes('free');
        if (aFree && !bFree) return -1;
        if (!aFree && bFree) return 1;
        return 0;
    });

    const header = ['Course Title', 'Provider', 'Cost', 'Description', 'Link', 'Source URL'].join('\t') + '\n';
    const rows = allCourses.map(c => {
        const title = (c.title || '').replace(/\t|\n/g, ' ');
        const provider = (c.provider || '').replace(/\t|\n/g, ' ');
        const cost = (c.cost || '').replace(/\t|\n/g, ' ');
        const desc = (c.description || '').replace(/\t|\n/g, ' ');
        const link = (c.link || '').replace(/\t|\n/g, ' ');
        return `${title}\t${provider}\t${cost}\t${desc}\t${link}\t${c.source_url}`;
    }).join('\n');
    
    fs.writeFileSync('av_training.tsv', header + rows);
    console.log(`Saved ${allCourses.length} training courses to av_training.tsv`);
}

scrapeTraining();
