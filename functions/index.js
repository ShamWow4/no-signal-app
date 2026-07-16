const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const axios = require("axios");
const { appendRow } = require('./sheetsSync');

// Initialize Firebase Admin to access Firestore and Push Notifications
admin.initializeApp();
const db = admin.firestore();

// ==========================================
// NOTIFICATION HELPER
// ==========================================
async function sendExpoPushNotifications(title, body, payloadData = {}) {
    const tokensSnapshot = await db.collection('push_tokens').get();
    if (tokensSnapshot.empty) return;
    
    const messages = [];
    tokensSnapshot.forEach((tokenDoc) => {
        const data = tokenDoc.data();
        if (data.token) {
            messages.push({
                to: data.token,
                sound: 'default',
                title: title,
                body: body,
                data: payloadData,
            });
        }
    });

    if (messages.length > 0) {
        try {
            const expoResponse = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                }
            });
            const expoData = expoResponse.data;
            if (expoData && expoData.data) {
                expoData.data.forEach((receipt, index) => {
                    if (receipt.status === 'error') {
                        console.error(`Expo Push Error for ${messages[index].to}:`, receipt.message);
                    }
                });
                console.log(`Sent push notification "${title}" to ${messages.length} devices.`);
            }
        } catch (error) {
            console.error(`Failed to send push notification:`, error.message);
        }
    }
}

// 1. The Target List (You will add your URLs here later)
const TARGET_URLS = [
    "https://www.ziprecruiter.com/jobs-search?search=audio+video+technician&location=New+Orleans%2C+LA&lk=p-TzyxQ4xk7Q-hx3ku4z2Q",

];

// 2. The Firecrawl Scraper (From our previous step)
async function scrapeProductionHouseJobs(targetUrl) {
    const response = await axios.post('https://api.firecrawl.dev/v1/scrape', {
        url: targetUrl,
        formats: ["extract"],
        extract: {
            prompt: "Extract all open job positions, freelance crew calls, and gig opportunities listed on this page. You MUST STRICTLY ONLY include jobs that are located in the New Orleans, LA area AND are specifically in the audio visual, lighting, staging, event production, or video industries. Ignore all jobs that are not related to AV/events or are outside New Orleans.",
            schema: {
                type: "object",
                properties: {
                    jobs: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                job_title: { type: "string", description: "The title of the job position" },
                                company_name: { type: "string", description: "The name of the company or employer" },
                                location: { type: "string", description: "The location of the job (city, state, or remote)" },
                                job_type: { type: "string", description: "Full-time, Part-time, Freelance, Contract, etc." },
                                salary: { type: "string", description: "Any mentioned pay rate, hourly wage, or salary range" },
                                description: { type: "string", description: "A detailed summary of the job responsibilities and requirements" },
                                apply_link: { type: "string", description: "The URL to apply for the job" }
                            },
                            required: ["job_title", "apply_link"]
                        }
                    }
                },
                required: ["jobs"]
            }
        }
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.data.extract.jobs;
}

// 3. The Scheduled Engine (Runs every day at 8:00 AM New Orleans time)
exports.dailyGigScraper = onSchedule(
    { schedule: "0 8 * * *", timeZone: "America/Chicago" },
    async (event) => {
        console.log("Starting daily AV gig sweep...");

        for (const url of TARGET_URLS) {
            try {
                const scrapedJobs = await scrapeProductionHouseJobs(url);

                for (const job of scrapedJobs) {
                    // Create a unique ID based on the job title and link to prevent duplicates
                    const jobId = Buffer.from(job.job_title + job.apply_link).toString('base64url');
                    const jobRef = db.collection('gig_alerts').doc(jobId);
                    const doc = await jobRef.get();

                    // 4. The Duplicate Check & Push Notification Trigger
                    if (!doc.exists) {
                        // Save the new job to Firestore
                        await jobRef.set({
                            ...job,
                            source_url: url,
                            date_discovered: admin.firestore.FieldValue.serverTimestamp()
                        });

                        console.log(`New Gig Found: ${job.job_title}`);

                        // Append to Google Sheets
                        await appendRow('gig_alerts', {
                            job_title: job.job_title,
                            company_name: job.company_name || '',
                            location: job.location || '',
                            job_type: job.job_type || '',
                            salary: job.salary || '',
                            description: job.description || '',
                            apply_link: job.apply_link || '',
                            source_url: url,
                            date_discovered: new Date().toISOString()
                        });

                        // Construct the Push Notification payload
                        const title = `New Gig Alert: ${job.job_title}`;
                        const body = job.description ? job.description.substring(0, 100) + '...' : 'Tap to view details and apply.';
                        
                        await sendExpoPushNotifications(title, body, { apply_link: job.apply_link });
                    }
                }
            } catch (error) {
                console.error(`Failed to scrape ${url}:`, error);
            }
        }
        console.log("Daily gig sweep complete.");
    }
);

// ==========================================
// AUTOMATED NEWS SCRAPER
// ==========================================

const NEWS_TARGET_URLS = [
    "https://mccno.com/press-releases/"
];

async function scrapeNews(targetUrl) {
    const response = await axios.post('https://api.firecrawl.dev/v1/scrape', {
        url: targetUrl,
        formats: ["extract"],
        extract: {
            prompt: "Extract the top 5 most recent press releases, convention announcements, or tourism news articles. You MUST STRICTLY ONLY include news that is explicitly relevant to the New Orleans area AND is specifically related to conventions, events, hospitality, or trade shows in New Orleans. Ignore general news or news not related to events/hospitality in New Orleans.",
            schema: {
                type: "object",
                properties: {
                    articles: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string", description: "Headline of the press release or news article" },
                                date: { type: "string", description: "The date of the news (e.g. Oct 1, 2026)" },
                                excerpt: { type: "string", description: "A 1-2 sentence summary of the news" },
                                type: { type: "string", description: "Always return one of: 'news', 'announcement', or 'event'" },
                                source_link: { type: "string", description: "The URL to read the full press release" }
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

exports.dailyNewsScraper = onSchedule(
    { schedule: "0 7 * * *", timeZone: "America/Chicago" },
    async (event) => {
        console.log("Starting daily AV news sweep...");

        for (const url of NEWS_TARGET_URLS) {
            try {
                const scrapedArticles = await scrapeNews(url);
                if (!scrapedArticles || scrapedArticles.length === 0) continue;

                for (const article of scrapedArticles) {
                    const articleId = Buffer.from(article.title).toString('base64url');
                    const articleRef = db.collection('news_feed').doc(articleId);
                    const doc = await articleRef.get();

                    if (!doc.exists) {
                        await articleRef.set({
                            ...article,
                            source_url: url,
                            date_discovered: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`New News Found: ${article.title}`);
                        
                        // Append to Google Sheets
                        await appendRow('news_feed', {
                            title: article.title,
                            date: article.date,
                            excerpt: article.excerpt || '',
                            type: article.type || '',
                            source_link: article.source_link || '',
                            source_url: url,
                            date_discovered: new Date().toISOString()
                        });
                        
                        const title = `Industry News: ${article.title}`;
                        const body = article.excerpt ? article.excerpt : 'Tap to read more.';
                        await sendExpoPushNotifications(title, body, { source_link: article.source_link });
                    }
                }
            } catch (error) {
                console.error(`Failed to scrape news from ${url}:`, error.message);
            }
        }
        console.log("Daily news sweep complete.");
    }
);

// ==========================================
// AUTOMATED CALENDAR SCRAPER
// ==========================================

const CALENDAR_TARGET_URLS = [
    "https://mccno.com/events/",
    "https://eventnow.encoreglobal.com/landingpage/newexhibit/index/"
];

async function scrapeCalendar(targetUrl) {
    const response = await axios.post('https://api.firecrawl.dev/v1/scrape', {
        url: targetUrl,
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
                                name: { type: "string", description: "Name of the event, convention, or tradeshow" },
                                loadIn: { type: "string", description: "The start date in YYYY-MM-DD format" },
                                loadOut: { type: "string", description: "The end date in YYYY-MM-DD format" },
                                venue: { type: "string", enum: ["NOMCC", "Hyatt Regency", "Sheraton New Orleans", "Hilton Riverside", "Marriott"], description: "The venue name classified perfectly." },
                                hall: { type: "string", description: "The specific hall, room, or exhibit area (optional)" },
                                type: { type: "string", description: "Event type (e.g., Convention, Tradeshow, Gala) (optional)" }
                            },
                            required: ["name", "loadIn", "loadOut", "venue"]
                        }
                    }
                },
                required: ["events"]
            }
        }
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.data.extract.events;
}

exports.dailyCalendarScraper = onSchedule(
    { schedule: "0 6 * * *", timeZone: "America/Chicago" },
    async (event) => {
        console.log("Starting daily AV calendar sweep...");

        for (const url of CALENDAR_TARGET_URLS) {
            try {
                const scrapedEvents = await scrapeCalendar(url);
                if (!scrapedEvents || scrapedEvents.length === 0) continue;

                for (const ev of scrapedEvents) {
                    const eventId = Buffer.from(`${ev.name}-${ev.venue}-${ev.loadIn}`).toString('base64url');
                    const eventRef = db.collection('calendar_events').doc(eventId);
                    const doc = await eventRef.get();

                    if (!doc.exists) {
                        await eventRef.set({
                            ...ev,
                            source_url: url,
                            date_discovered: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`New Calendar Event Found: ${ev.name} at ${ev.venue}`);
                        
                        // Append to Google Sheets
                        await appendRow('calendar_events', {
                            name: ev.name,
                            loadIn: ev.loadIn,
                            loadOut: ev.loadOut,
                            venue: ev.venue,
                            hall: ev.hall || '',
                            type: ev.type || '',
                            source_url: url,
                            date_discovered: new Date().toISOString()
                        });
                        
                        const title = `New Event: ${ev.name}`;
                        const body = `Venue: ${ev.venue} | Load In: ${ev.loadIn}`;
                        await sendExpoPushNotifications(title, body, { });
                    }
                }
            } catch (error) {
                console.error(`Failed to scrape calendar from ${url}:`, error.message);
            }
        }
        console.log("Daily calendar sweep complete.");
    }
);
