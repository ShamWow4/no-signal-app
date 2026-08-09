const axios = require("axios");
process.env.FIRECRAWL_API_KEY = 'fc-5308d0d6ba954d18adae9c4996e1ab94';

const TARGET_URLS = [
    "https://www.indeed.com/jobs?q=audio+video+technician&l=new+orleans%2C+la&radius=35",
];

async function scrapeProductionHouseJobs(targetUrl) {
    const response = await axios.post('https://api.firecrawl.dev/v1/scrape', {
        url: targetUrl,
        formats: ["extract"],
        extract: {
            prompt: "Extract all open job positions, freelance crew calls, and gig opportunities listed on this page. Focus specifically on audio visual, lighting, staging, and video roles. STRICTLY ignore and exclude any jobs located outside the New Orleans, LA area.",
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
    let allValidJobs = [];
    console.log("Starting preview scrape...");

    for (const url of TARGET_URLS) {
        try {
            console.log(`Scraping: ${url}`);
            const scrapedJobs = await scrapeProductionHouseJobs(url);

            if (!scrapedJobs || scrapedJobs.length === 0) {
                console.log(`No jobs found on ${url}`);
                continue;
            }

            for (const job of scrapedJobs) {
                if (job.location) {
                    const loc = job.location.toLowerCase();
                    const nolaKeywords = ['new orleans', 'nola', 'metairie', 'kenner', 'gretna', 'chalmette', 'harahan', 'westwego', 'louisiana', ', la'];
                    const isNola = nolaKeywords.some(keyword => loc.includes(keyword));
                    
                    const isRemote = loc.includes('remote') || loc.includes('anywhere');
                    
                    if (!isNola && !isRemote) {
                        console.log(`  [SKIPPED] ${job.job_title} at ${job.location}`);
                        continue;
                    }
                }
                allValidJobs.push({
                    title: job.job_title,
                    company: job.company_name,
                    location: job.location,
                    salary: job.salary
                });
            }
        } catch (e) {
            console.error(`Error scraping ${url}:`, e.response ? JSON.stringify(e.response.data) : e.message);
        }
    }

    console.log("\n====== VALID JOBS PREVIEW ======\n");
    console.log(JSON.stringify(allValidJobs, null, 2));
    console.log(`\nTotal valid jobs found: ${allValidJobs.length}`);
}

run();
