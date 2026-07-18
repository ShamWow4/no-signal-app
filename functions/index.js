const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const axios = require("axios");
const { appendRow, getSheetData } = require('./sheetsSync');
const crypto = require('crypto');
const { scrapeEventNow } = require('./scraper/scrape_no');

// Initialize Firebase Admin to access Firestore and Push Notifications
admin.initializeApp();
const db = admin.firestore();

// ==========================================
// NOTIFICATION HELPER
// ==========================================
async function sendExpoPushNotifications(title, body, payloadData = {}, target = 'all') {
    const tokens = new Set();
    const messages = [];

    // 1. Check legacy push_tokens collection (we only use this for 'all' as a fallback)
    if (target === 'all') {
        const legacySnapshot = await db.collection('push_tokens').get();
        legacySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.token) tokens.add(data.token);
        });
    }

    // 2. Check modern users collection where preferences live
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.pushToken) {
            const prefs = data.notificationPrefs || {};
            let shouldSend = true;
            if (target === 'gigs' && prefs.gigs === false) shouldSend = false;
            if (target === 'calendar' && prefs.calendar === false) shouldSend = false;
            if (target === 'news' && prefs.news === false) shouldSend = false;
            
            if (shouldSend) tokens.add(data.pushToken);
        }
    });

    if (tokens.size === 0) return;
    
    tokens.forEach((token) => {
        messages.push({
            to: token,
            sound: 'default',
            title: title,
            body: body,
            data: payloadData,
        });
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
    { schedule: "0 6 * * *", timeZone: "America/Chicago", timeoutSeconds: 300, memory: "2GiB" },
    async (event) => {
        console.log("Starting daily AV calendar sweep...");

        for (const url of CALENDAR_TARGET_URLS) {
            try {
                let scrapedEvents = [];
                if (url.includes('eventnow.encoreglobal.com')) {
                    console.log("Using Puppeteer to scrape EventNow...");
                    const rawEvents = await scrapeEventNow();
                    scrapedEvents = rawEvents.map(e => ({
                        name: e.title,
                        venue: e.venue,
                        loadIn: e.loadIn,
                        loadOut: e.loadOut,
                        type: 'Tradeshow/Convention',
                        hall: ''
                    }));
                } else {
                    scrapedEvents = await scrapeCalendar(url);
                }
                
                if (!scrapedEvents || scrapedEvents.length === 0) continue;

                for (const ev of scrapedEvents) {
                    const eventId = Buffer.from(`${ev.name}-${ev.venue}-${ev.loadIn}`).toString('base64url');
                    const eventRef = db.collection('calendar_events_raw').doc(eventId);
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
                    }
                }
            } catch (error) {
                console.error(`Failed to scrape calendar from ${url}:`, error.message);
            }
        }
        console.log("Daily calendar sweep complete.");
    }
);

// ==========================================
// DAILY DIRECTORY SCRAPER
// ==========================================
exports.dailyDirectoryScraper = onSchedule(
    { schedule: "0 4 * * *", timeZone: "America/Chicago", timeoutSeconds: 300, memory: "1GiB" },
    async (event) => {
        console.log("Starting Daily Directory Scraper...");
        
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
                    'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY || 'fc-5308d0d6ba954d18adae9c4996e1ab94'}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data && response.data.success && response.data.data && response.data.data.extract) {
                const newCompanies = response.data.data.extract.companies || [];
                console.log(`Found ${newCompanies.length} companies. Checking for duplicates...`);
                
                const directoryRef = db.collection('labor_directory_raw');
                
                for (const company of newCompanies) {
                    // Generate a safe ID based on company name
                    const docId = Buffer.from(company.name.toLowerCase().replace(/\s+/g, '')).toString('base64url');
                    const doc = await directoryRef.doc(docId).get();
                    
                    if (!doc.exists) {
                        await directoryRef.doc(docId).set(company);
                        console.log(`+ Appending to Google Sheets: ${company.name}`);
                        await appendRow('labor_directory', {
                            'Company Name': company.name || '',
                            'Company Website': company.website || '',
                            'Contact phone number': company.phone || '',
                            'Contact Name': '',
                            'Position': '',
                            'Email': '',
                            'Type': company.type || 'COMPANY'
                        });
                    } else {
                        console.log(`- Skipped existing: ${company.name}`);
                    }
                }
            }
        } catch(e) {
            console.error("Failed to scrape directory:", e.message);
        }
    }
);

// ==========================================
// DAILY TRAINING SCRAPER
// ==========================================
exports.dailyTrainingScraper = onSchedule(
    { schedule: "0 5 * * *", timeZone: "America/Chicago", timeoutSeconds: 500, memory: "1GiB" },
    async (event) => {
        console.log("Starting Daily Training Scraper...");
        
        const urls = [
            'https://www.avixa.org/training-section',
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

        const apiKey = process.env.FIRECRAWL_API_KEY || 'fc-5308d0d6ba954d18adae9c4996e1ab94';
        const trainingRef = db.collection('av_training_raw');

        for (const url of urls) {
            console.log(`Scraping training from ${url}...`);
            try {
                const response = await axios.post('https://api.firecrawl.dev/v1/scrape', {
                    url: url,
                    formats: ["extract"],
                    extract: { 
                        prompt: 'Extract any Audio/Video or AV industry relevant training courses or certifications. Prioritize extracting free coursework if available, followed by paid content. Include course title, provider, cost (free/paid), link, and a short description.',
                        schema: schema
                    }
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.data && response.data.success && response.data.data && response.data.data.extract) {
                    const courses = response.data.data.extract.courses || [];
                    for (const c of courses) {
                        const titleLower = (c.title || '').toLowerCase().replace(/\s+/g, '');
                        if (!titleLower) continue;
                        
                        const docId = Buffer.from(titleLower).toString('base64url');
                        const doc = await trainingRef.doc(docId).get();
                        
                        if (!doc.exists) {
                            await trainingRef.doc(docId).set(c);
                            console.log(`+ Appending to Google Sheets: ${c.title}`);
                            await appendRow('av_training', {
                                'Course Title': c.title || '',
                                'Platform/Instructor': c.provider || '',
                                'Type': (c.title || '').toLowerCase().includes('audio') ? 'Audio' : 'General',
                                'Link': c.link || '',
                                'Duration': '',
                                'Price': c.cost || ''
                            });
                        } else {
                            console.log(`- Skipped existing: ${c.title}`);
                        }
                    }
                }
            } catch(e) {
                console.error(`Failed to scrape ${url}:`, e.message);
            }
        }
    }
);

// ==========================================
// MASTER SHEET SYNC TO APP
// ==========================================

function generateId(string) {
    return crypto.createHash('md5').update(string).digest('hex');
}

async function pushToCollection(collectionName, data, idFieldGetter, trackNew = false) {
    if (!data || data.length === 0) {
        console.log(`No data to push to ${collectionName}.`);
        return { count: 0, newDocsCount: 0 };
    }
    
    console.log(`Pushing ${data.length} items to ${collectionName}...`);
    const batch = db.batch();
    const collectionRef = db.collection(collectionName);
    
    let count = 0;
    let newDocsCount = 0;

    for (const item of data) {
        const idString = idFieldGetter(item);
        if (!idString) continue;
        
        const docId = generateId(idString);
        const docRef = collectionRef.doc(docId);
        
        if (trackNew) {
            const doc = await docRef.get();
            if (!doc.exists) {
                newDocsCount++;
            }
        }
        
        batch.set(docRef, item, { merge: true });
        count++;
        
        if (count % 400 === 0) {
            await batch.commit();
            console.log(`Committed ${count} items...`);
        }
    }
    if (count % 400 !== 0) {
        await batch.commit();
    }
    console.log(`Successfully pushed ${count} items to ${collectionName}. (${newDocsCount} new)`);
    return { count, newDocsCount };
}

exports.syncMasterSheetToApp = onSchedule(
    { schedule: "0 12 * * *", timeZone: "America/Chicago", timeoutSeconds: 300, memory: "2GiB" },
    async (event) => {
        console.log("Starting Master Sheet Sync to Firebase...");

        const syncConfigs = [
            { tab: 'calendar_events', collection: 'calendar_events', getId: item => item['Title'] ? item['Title'] + (item['Dates']||'') : null },
            { tab: 'news_feed', collection: 'av_news', getId: item => item['Title'] ? item['Title'] + (item['Date']||'') : null },
            { tab: 'gig_alerts', collection: 'av_gigs', getId: item => item['Job Title'] ? item['Job Title'] + (item['Company']||'') : null },
            { tab: 'labor_directory', collection: 'labor_directory', getId: item => item['Company Name'] ? item['Company Name'] : null },
            { tab: 'av_training', collection: 'av_training', getId: item => item['Course Title'] ? item['Course Title'] : null }
        ];

        let totalNewGigs = 0;
        let totalNewEvents = 0;

        for (const config of syncConfigs) {
            console.log(`\nFetching data from ${config.tab}...`);
            let data = await getSheetData(config.tab);

            // Filter jobs to only those discovered in the last 48 hours
            if (config.collection === 'av_gigs') {
                const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
                const originalLength = data.length;
                data = data.filter(item => {
                    if (!item['date_discovered']) return true; // Sync if no date exists
                    const discovered = new Date(item['date_discovered']);
                    return !isNaN(discovered) && discovered >= fortyEightHoursAgo;
                });
                console.log(`Filtered ${config.tab}: ${originalLength} total -> ${data.length} recent items (last 48h).`);
            }

            const trackNew = config.collection === 'av_gigs' || config.collection === 'calendar_events';
            const result = await pushToCollection(config.collection, data, config.getId, trackNew);
            
            if (config.collection === 'av_gigs') totalNewGigs = result.newDocsCount;
            if (config.collection === 'calendar_events') totalNewEvents = result.newDocsCount;
        }

        if (totalNewGigs > 0) {
            const title = `New Gigs Available!`;
            const body = `${totalNewGigs} new ${totalNewGigs === 1 ? 'gig has' : 'gigs have'} been posted to the board.`;
            await sendExpoPushNotifications(title, body, { url: '/(tabs)/gigs' }, 'gigs');
        }
        
        if (totalNewEvents > 0) {
            const title = `New Events Added!`;
            const body = `${totalNewEvents} new ${totalNewEvents === 1 ? 'event has' : 'events have'} been added to the calendar.`;
            await sendExpoPushNotifications(title, body, { url: '/(tabs)/' }, 'calendar');
        }

        console.log("\nMaster Sheet Sync complete!");
    }
);

// ==========================================
// ADMIN BROADCAST TOOL
// ==========================================
const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.sendAdminBroadcast = onCall(async (request) => {
    // Note: For option C (openly visible), we don't enforce authentication on this cloud function.
    // If transitioning to Option A, we would add:
    // if (!request.auth || request.auth.token.email !== 'shimeong@gmail.com') {
    //     throw new HttpsError('permission-denied', 'Only admins can broadcast notifications.');
    // }

    const { title, body, target } = request.data;
    if (!title || !body) {
        throw new HttpsError('invalid-argument', 'Title and Body are required.');
    }

    const payloadTarget = target || 'all';
    console.log(`Sending Admin Broadcast [${payloadTarget}]: ${title}`);
    
    // Default to the home screen if they tap it
    await sendExpoPushNotifications(title, body, { url: '/(tabs)/' }, payloadTarget);

    return { success: true };
});

