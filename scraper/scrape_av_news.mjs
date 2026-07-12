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

async function scrapeNews() {
    // The user requested these two for AV News
    const urls = [
        'https://mccno.com/news/',
        'https://www.commercialintegrator.com/',
        'https://www.avnetwork.com/',
        'https://www.neworleans.com/',
        'https://www.nola.com/'
    ];
    
    const schema = {
        type: 'object',
        properties: {
            articles: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        date: { type: 'string' },
                        link: { type: 'string' },
                        summary: { type: 'string' }
                    },
                    required: ['title', 'date', 'link', 'summary']
                }
            }
        }
    };

    let allNews = [];
    
    for (const url of urls) {
        console.log(`Scraping news from ${url}...`);
        try {
            const data = await scrapeWithFirecrawl(url, 'Extract the top 5 latest news articles, local press releases, or Audio Visual industry news shown on this homepage. Return the title, publication date, URL link to the article, and a brief 1-sentence summary.', schema);
            
            if (data && data.success && data.data && data.data.extract && data.data.extract.articles) {
                const articles = data.data.extract.articles.map(a => ({...a, source: url}));
                allNews.push(...articles);
            } else {
                console.log(`Could not extract from ${url}:`, JSON.stringify(data).substring(0, 500));
            }
        } catch(e) {
            console.error(`Failed to scrape ${url}:`, e.message);
        }
    }
    
    const header = ['Title', 'Date', 'Summary', 'Link', 'Source'].join('\t') + '\n';
    const rows = allNews.map(n => {
        const title = (n.title || '').replace(/\t|\n/g, ' ');
        const date = (n.date || '').replace(/\t|\n/g, ' ');
        const summary = (n.summary || '').replace(/\t|\n/g, ' ');
        const link = (n.link || '').replace(/\t|\n/g, ' ');
        return `${title}\t${date}\t${summary}\t${link}\t${n.source}`;
    }).join('\n');
    
    fs.writeFileSync('av_news.tsv', header + rows);
    console.log(`Saved ${allNews.length} news articles to av_news.tsv`);
}

scrapeNews();
