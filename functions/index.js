const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const axios = require("axios");

// Initialize Firebase Admin to access Firestore and Push Notifications
admin.initializeApp();
const db = admin.firestore();

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
            prompt: "Extract all open job positions, freelance crew calls, and gig opportunities listed on this page. Focus specifically on audio visual, lighting, staging, and video roles.",
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

                        // Construct the Push Notification payload
                        const title = `New Gig Alert: ${job.job_title}`;
                        const body = job.description ? job.description.substring(0, 100) + '...' : 'Tap to view details and apply.';
                        
                        // Fetch all tokens from Firebase
                        const tokensSnapshot = await db.collection('push_tokens').get();
                        
                        if (!tokensSnapshot.empty) {
                            const messages = [];
                            tokensSnapshot.forEach((tokenDoc) => {
                                const data = tokenDoc.data();
                                if (data.token) {
                                    messages.push({
                                        to: data.token,
                                        sound: 'default',
                                        title: title,
                                        body: body,
                                        data: { apply_link: job.apply_link },
                                    });
                                }
                            });

                            if (messages.length > 0) {
                                // Send the alert to the crew via Expo
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
                                            } else {
                                                console.log(`Push notification sent for ${job.job_title} to ${messages.length} devices.`);
                                            }
                                        });
                                    }
                                } catch (expoError) {
                                    console.error(`Failed to send push notification for ${job.job_title}:`, expoError.message);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Failed to scrape ${url}:`, error);
            }
        }
        console.log("Daily gig sweep complete.");
    }
);
