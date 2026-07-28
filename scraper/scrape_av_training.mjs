import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.FIRECRAWL_API_KEY || "fc-5308d0d6ba954d18adae9c4996e1ab94";

const FALLBACK_TRAINING = [
    {
        title: 'Audinate Dante Certification (Level 1, 2 & 3)',
        provider: 'Audinate',
        cost: 'Free',
        type: 'Audio DSP',
        duration: 'Self-Paced (approx. 12 hrs)',
        description: 'Comprehensive audio networking masterclass covering IP routing, latency tuning, clock synchronization, PTP v1/v2, Dante Domain Manager, and AES67 interoperability for live sound and installation.',
        link: 'https://www.audinate.com/learning/training-certification/',
        source_url: 'Audinate Official'
    },
    {
        title: 'Q-SYS Level 1 & 2 Systems Certification',
        provider: 'QSC Q-SYS',
        cost: 'Free',
        type: 'Audio DSP',
        duration: '15 Hours Online',
        description: 'Hands-on DSP architecture, Core hardware configuration, Lua control scripting, custom User Control Interfaces (UCI), and Acoustic Echo Cancellation (AEC) integration.',
        link: 'https://www.qsys.com/support/training-services/',
        source_url: 'Q-SYS Training'
    },
    {
        title: 'Shure Audio Institute (SAI) Wireless & RF Certification',
        provider: 'Shure',
        cost: 'Free',
        type: 'RF & Wireless',
        duration: '8 Hours Online',
        description: 'Master RF spectrum coordination using Wireless Workbench 7 (WWB7), antenna distribution, mic placement, and digital wireless infrastructure for stadium & arena events.',
        link: 'https://www.shure.com/en-US/meta/shure-audio-institute',
        source_url: 'Shure Audio Institute'
    },
    {
        title: 'AVIXA CTS (Certified Technology Specialist) Prep',
        provider: 'AVIXA',
        cost: 'Member Free',
        type: 'General AV',
        duration: '40 Hours Coursework',
        description: 'The ANSI-accredited global standard credential for AV professionals covering acoustics, DISCAS viewing distance math, video display physics, cable impedance, and project staging.',
        link: 'https://www.avixa.org/certifications/CTS',
        source_url: 'AVIXA Official'
    },
    {
        title: 'Resolume Arena 7 Media Server & LED Mapping Masterclass',
        provider: 'Resolume / NOLA AV',
        cost: 'Free Tutorials',
        type: 'Video & LED',
        duration: '6 Hours Video',
        description: 'Projection mapping, LED wall output mapping, SMPTE timecode sync, NDI video streams, ArtNet DMX integration, and live VJ performance control for festival stages.',
        link: 'https://resolume.com/training/',
        source_url: 'Resolume Official'
    },
    {
        title: 'grandMA3 & ETC EOS Lighting Console Essentials',
        provider: 'MA Lighting & ETC',
        cost: 'Free Online',
        type: 'Lighting',
        duration: '10 Hours Online',
        description: 'Practical programming for moving lights, DMX-512 universe routing, ArtNet/sACN setup, fixture patching, cue list execution, and 3D visualizer staging.',
        link: 'https://www.malighting.com/training-support/ma-university/',
        source_url: 'MA University'
    },
    {
        title: 'OSHA 10 General Industry (Live Event & Stagehand Safety)',
        provider: 'OSHA Training Institute',
        cost: 'Paid (~$60)',
        type: 'Safety & Rigging',
        duration: '10 Hours Online',
        description: 'Essential safety compliance for stagehands, riggers, and production technicians. Covers fall protection, electrical safety, NFPA 70E compliance, and PPE standards.',
        link: 'https://www.osha.gov/training',
        source_url: 'OSHA Official'
    },
    {
        title: 'SynAudCon Sound System Design & Room Acoustics',
        provider: 'SynAudCon',
        cost: 'Paid Course',
        type: 'Audio DSP',
        duration: '16 Hours Advanced',
        description: 'In-depth physical acoustics, Speech Transmission Index (STI) measurement, line array beam steering, room equalization, and loudspeaker array physics.',
        link: 'https://www.prosoundtraining.com/',
        source_url: 'SynAudCon'
    }
];

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
    console.log("Fetching AV Training...");
    const urls = [
        'https://www.avixa.org/training-section',
        'https://www.coursera.org/search?query=audio%20visual',
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
                        cost: { type: 'string' },
                        link: { type: 'string' },
                        description: { type: 'string' },
                        type: { type: 'string' },
                        duration: { type: 'string' }
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
            const data = await scrapeWithFirecrawl(url, 'Extract AV industry relevant training courses or certifications. Include title, provider, cost, link, description.', schema);
            
            if (data && data.success && data.data && data.data.extract && data.data.extract.courses) {
                const courses = data.data.extract.courses.map(c => ({...c, source_url: url}));
                allCourses.push(...courses);
            } else {
                console.log(`Could not extract via Firecrawl from ${url}`);
            }
        } catch(e) {
            console.error(`Failed to scrape ${url}:`, e.message);
        }
    }

    if (allCourses.length === 0) {
        console.log("Using curated AV Training & Certification baseline catalog...");
        allCourses.push(...FALLBACK_TRAINING);
    }
    
    // Sort so 'Free' comes first
    allCourses.sort((a, b) => {
        const aFree = (a.cost || '').toLowerCase().includes('free');
        const bFree = (b.cost || '').toLowerCase().includes('free');
        if (aFree && !bFree) return -1;
        if (!aFree && bFree) return 1;
        return 0;
    });

    const header = ['Course Title', 'Provider', 'Cost', 'Description', 'Link', 'Source URL', 'Type', 'Duration'].join('\t') + '\n';
    const rows = allCourses.map(c => {
        const title = (c.title || '').replace(/\t|\n/g, ' ');
        const provider = (c.provider || '').replace(/\t|\n/g, ' ');
        const cost = (c.cost || '').replace(/\t|\n/g, ' ');
        const desc = (c.description || '').replace(/\t|\n/g, ' ');
        const link = (c.link || '').replace(/\t|\n/g, ' ');
        const sourceUrl = (c.source_url || '').replace(/\t|\n/g, ' ');
        const type = (c.type || 'General AV').replace(/\t|\n/g, ' ');
        const duration = (c.duration || 'Self-Paced').replace(/\t|\n/g, ' ');
        return `${title}\t${provider}\t${cost}\t${desc}\t${link}\t${sourceUrl}\t${type}\t${duration}`;
    }).join('\n');
    
    fs.writeFileSync('av_training.tsv', header + rows);
    console.log(`✅ Saved ${allCourses.length} training courses to av_training.tsv`);
}

scrapeTraining();
