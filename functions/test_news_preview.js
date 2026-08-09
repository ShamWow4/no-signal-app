const axios = require("axios");
const admin = require("firebase-admin");

// Manually set API key for local preview script
process.env.FIRECRAWL_API_KEY = 'fc-5308d0d6ba954d18adae9c4996e1ab94';

try {
    admin.initializeApp();
} catch (e) {}

const db = admin.firestore();

const NEWS_TARGET_URLS = [
    "https://mccno.com/news/",
    "https://www.neworleans.com/about-us/pr/"
];

async function scrapeNews(targetUrl) {
    console.log("Scraping:", targetUrl);
    const response = await axios.post('https://api.firecrawl.dev/v1/scrape', {
        url: targetUrl,
        formats: ["extract"],
        extract: {
            prompt: "Extract the top 5 most recent press releases, convention announcements, or tourism news articles. Focus on events, hospitality, and trade show news relevant to the New Orleans area.",
            schema: {
                type: "object",
                properties: {
                    articles: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                date: { type: "string" },
                                excerpt: { type: "string" },
                                type: { type: "string" },
                                source_link: { type: "string" }
                            },
                            required: ["title", "date", "excerpt", "type"]
                        }
                    }
                },
                required: ["articles"]
            }
        }
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.data.extract.articles;
}

async function run() {
    let allArticles = [];
    for (const url of NEWS_TARGET_URLS) {
        try {
            const articles = await scrapeNews(url);
            console.log(`Found ${articles.length} articles from ${url}`);
            allArticles = allArticles.concat(articles);
            
            // Try saving to DB if admin is initialized properly
            for (const article of articles) {
                const articleId = Buffer.from(article.title).toString('base64url');
                const articleRef = db.collection('news_drafts').doc(articleId);
                await articleRef.set({
                    ...article,
                    source_url: url,
                    date_discovered: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch(e) {
            console.error(`Error with ${url}:`, e.message);
        }
    }
    
    const fs = require('fs');
    fs.writeFileSync('news_results.json', JSON.stringify(allArticles, null, 2));
    console.log("Saved preview to news_results.json");
}

run();
