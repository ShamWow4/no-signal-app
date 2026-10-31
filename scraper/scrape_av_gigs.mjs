import fs from 'fs';

async function scrapeMccnoGigs() {
  console.log('🔍 Querying Ernest N. Morial Convention Center Job Board...');
  
  // The hidden backend API endpoint for UKG/UltiPro job boards
  const url = 'https://recruiting2.ultipro.com/NEW1051NOPF/JobBoard/8b2bed5a-bb88-48a9-be36-2487405c409d/JobBoardView/LoadSearchResults';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      // Requesting the first 50 most recent jobs
      body: JSON.stringify({
        "opportunitySearch": {
          "Top": 50,
          "Skip": 0,
          "QueryString": "",
          "OrderBy": [{"Value": "postedDateDesc", "PropertyName": "PostedDate", "Ascending": false}]
        },
        "matchCriteria": {
          "LanguageName": "en-US"
        }
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    const jobs = data.opportunities || [];
    
    console.log(`✅ Found ${jobs.length} total jobs. Filtering for AV/Event roles...`);
    
    // Keywords relevant to the Academy
    const keywords = ['av', 'audio', 'visual', 'production', 'event', 'technician', 'stage', 'operations', 'crew'];
    
    const avJobs = jobs.filter(job => {
      const title = job.Title.toLowerCase();
      return keywords.some(kw => title.includes(kw));
    }).map(job => ({
      title: job.Title,
      department: job.Department || 'N/A',
      posted: new Date(job.PostedDate).toLocaleDateString(),
      url: `https://recruiting2.ultipro.com/NEW1051NOPF/JobBoard/8b2bed5a-bb88-48a9-be36-2487405c409d/OpportunityDetail?opportunityId=${job.Id}`
    }));

    if (avJobs.length > 0) {
      console.log(`\n🎯 Found ${avJobs.length} relevant gigs!`);
      console.table(avJobs);
      
      // Save to a TSV file so your run_pipeline.mjs can eventually pick it up
      const tsvHeader = "Title\tDepartment\tPosted\tURL\n";
      const tsvRows = avJobs.map(j => `${j.title}\t${j.department}\t${j.posted}\t${j.url}`).join('\n');
      fs.writeFileSync('av_gigs.tsv', tsvHeader + tsvRows);
      console.log('\n💾 Saved to av_gigs.tsv');
    } else {
      console.log('No specific AV/Production jobs currently posted.');
    }

  } catch (error) {
    console.error('❌ Failed to fetch MCCNO jobs:', error.message);
  }
}

scrapeMccnoGigs();
