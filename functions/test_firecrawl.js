const axios = require('axios');

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
                                job_title: { type: "string" },
                                job_type: { type: "string" },
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
    try {
        console.log("Testing Firecrawl scrape for ZipRecruiter...");
        const jobs = await scrapeProductionHouseJobs("https://www.ziprecruiter.com/jobs-search?search=audio+video+technician&location=New+Orleans%2C+LA&lk=p-TzyxQ4xk7Q-hx3ku4z2Q");
        console.log(JSON.stringify(jobs, null, 2));
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}
run();
