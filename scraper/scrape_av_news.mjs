import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FIRECRAWL_API_KEY || "fc-5308d0d6ba954d18adae9c4996e1ab94";

const AV_KEYWORDS = [
  'audio', 'visual', 'av', 'sound', 'speaker', 'mic', 'microphone', 'display', 'led', 'screen',
  'video', 'projector', 'lighting', 'stage', 'staging', 'rigging', 'event', 'convention', 
  'hospitality', 'broadcast', 'streaming', 'dante', 'q-sys', 'shure', 'avixa', 'cts', 
  'integration', 'integrator', 'pro av', 'signage', 'acoustic', 'new orleans', 'nola', 'mccno',
  'morial', 'arena', 'theater', 'production', 'venue', 'tech'
];

function isRelevantToAV(title, summary, isMccno) {
  if (isMccno) return true; // Always include MCCNO news
  const text = `${title} ${summary}`.toLowerCase();
  return AV_KEYWORDS.some(kw => text.includes(kw));
}

function parseRSS(xmlText, sourceUrl, feedName) {
    const items = [];
    const itemRegex = /<item[\s\S]*?<\/item>/gi;
    let match;
    const isMccno = feedName.toLowerCase().includes('mccno');
    
    while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemXml = match[0];
        const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
        const dateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
        const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
        
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        const link = linkMatch ? linkMatch[1].trim() : '';
        const date = dateMatch && !isNaN(new Date(dateMatch[1])) ? new Date(dateMatch[1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        let summary = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
        if (summary.length > 200) summary = summary.substring(0, 197) + '...';
        
        if (title && link && isRelevantToAV(title, summary, isMccno)) {
            items.push({ title, date, summary, link, source: sourceUrl });
        }
    }
    return items;
}

async function fetchRSS(feedUrl, feedName) {
    try {
        const response = await fetch(feedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (!response.ok) return [];
        const xml = await response.text();
        return parseRSS(xml, feedUrl, feedName);
    } catch (e) {
        console.error(`RSS fetch error for ${feedUrl}:`, e.message);
        return [];
    }
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

async function scrapeNews() {
    console.log("Fetching AV News...");
    const rssFeeds = [
        { name: 'MCCNO News', url: 'https://mccno.com/feed/' },
        { name: 'Commercial Integrator', url: 'https://www.commercialintegrator.com/feed/' },
        { name: 'AV Network', url: 'https://www.avnetwork.com/feeds/all' }
    ];

    let allNews = [];

    // 1. First try RSS Feeds with industry relevance filtering
    for (const feed of rssFeeds) {
        console.log(`Fetching RSS feed: ${feed.name}...`);
        const articles = await fetchRSS(feed.url, feed.name);
        if (articles.length > 0) {
            console.log(`Found ${articles.length} AV-relevant articles from ${feed.name}`);
            allNews.push(...articles.slice(0, 10));
        }
    }

    // 2. If RSS didn't get enough news, try Firecrawl
    if (allNews.length < 5) {
        const urls = [
            'https://mccno.com/news/',
            'https://www.commercialintegrator.com/',
            'https://www.avnetwork.com/'
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

        for (const url of urls) {
            console.log(`Scraping news via Firecrawl: ${url}...`);
            try {
                const data = await scrapeWithFirecrawl(url, 'Extract top 5 latest AV industry news articles with title, date, link, summary.', schema);
                if (data && data.success && data.data && data.data.extract && data.data.extract.articles) {
                    const isMccno = url.includes('mccno');
                    const articles = data.data.extract.articles
                        .filter(a => isRelevantToAV(a.title, a.summary, isMccno))
                        .map(a => ({...a, source: url}));
                    allNews.push(...articles);
                }
            } catch(e) {
                console.error(`Firecrawl error for ${url}:`, e.message);
            }
        }
    }

    // Deduplicate by title
    const seenTitles = new Set();
    const uniqueNews = [];
    for (const item of allNews) {
        const normTitle = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normTitle && !seenTitles.has(normTitle)) {
            seenTitles.add(normTitle);
            uniqueNews.push(item);
        }
    }

    const header = ['Title', 'Date', 'Summary', 'Link', 'Source'].join('\t') + '\n';
    const rows = uniqueNews.map(n => {
        const title = (n.title || '').replace(/\t|\n/g, ' ');
        const date = (n.date || '').replace(/\t|\n/g, ' ');
        const summary = (n.summary || '').replace(/\t|\n/g, ' ');
        const link = (n.link || '').replace(/\t|\n/g, ' ');
        return `${title}\t${date}\t${summary}\t${link}\t${n.source}`;
    }).join('\n');
    
    fs.writeFileSync('av_news.tsv', header + rows);
    console.log(`✅ Saved ${uniqueNews.length} AV-relevant news articles to av_news.tsv`);
}

scrapeNews();
