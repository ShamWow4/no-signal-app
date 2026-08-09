const admin = require("firebase-admin");
const axios = require("axios");

// Initialize Firebase using the local service account key
const serviceAccount = require("../nola-visual-arts-1f3cf-firebase-adminsdk-fbsvc-6678b8be87.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

process.env.FIRECRAWL_API_KEY = 'fc-5308d0d6ba954d18adae9c4996e1ab94';

const TARGET_URLS = [
    "https://www.ziprecruiter.com/jobs-search?search=audio+video+technician&location=New+Orleans%2C+LA&lk=p-TzyxQ4xk7Q-hx3ku4z2Q",
    "https://www.indeed.com/jobs?q=audio+video+technician&l=new+orleans%2C+la&radius=35",
    "https://www.glassdoor.com/Job/jobs.htm?sc.keyword=Audio%20Video%20Technician&locT=C&locKeyword=New%20Orleans,%20LA"
];

async function scrapeProductionHouseJobs(targetUrl) {
    const response = await axios.post('https://api.firecrawl.dev/v1/scrape', {
        url: targetUrl,
        formats: ["extract"],
        extract: {
            prompt: "Extract exactly the top 10 open job positions, freelance crew calls, and gig opportunities listed on this page. Focus specifically on audio visual, lighting, staging, and video roles. STRICTLY ignore and exclude any jobs located outside the New Orleans, LA area. Do not return more than 10 jobs.",
            schema: {
                type: "object",
                properties: {
                    jobs: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                job_title: { type: "string" },
                                company_name: { type: "string" },
                                location: { type: "string" },
                                job_type: { type: "string" },
                                salary: { type: "string" },
                                description: { type: "string" },
                                apply_link: { type: "string" }
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

async function run() {
    console.log("Starting manual AV gig sweep to populate DB...");

    for (const url of TARGET_URLS) {
        try {
            console.log(`Scraping ${url}...`);
            const scrapedJobs = await scrapeProductionHouseJobs(url);
            let validJobsFound = 0;

            if (!scrapedJobs || scrapedJobs.length === 0) continue;

            for (const job of scrapedJobs) {
                if (validJobsFound >= 10) break;

                if (job.location) {
                    const loc = job.location.toLowerCase();
                    const nolaKeywords = ['new orleans', 'nola', 'metairie', 'kenner', 'gretna', 'chalmette', 'harahan', 'westwego', 'louisiana', ', la'];
                    const isNola = nolaKeywords.some(keyword => loc.includes(keyword));
                    const isRemote = loc.includes('remote') || loc.includes('anywhere');
                    
                    if (!isNola && !isRemote) {
                        continue;
                    }
                }
                
                validJobsFound++;

                const jobId = Buffer.from(job.job_title + job.apply_link).toString('base64url');
                const jobRef = db.collection('gig_alerts').doc(jobId);
                const doc = await jobRef.get();

                if (!doc.exists) {
                    await jobRef.set({
                        ...job,
                        source_url: url,
                        date_discovered: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`Added Gig: ${job.job_title}`);
                }
            }
        } catch (error) {
            console.error(`Failed to scrape ${url}:`, error.message);
        }
    }
    console.log("Manual DB sweep complete.");
}

run();
