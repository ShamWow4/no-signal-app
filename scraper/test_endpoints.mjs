import fetch from 'node-fetch';

async function testMCCNOJSON() {
  console.log("Fetching MCCNO JSON...");
  const res = await fetch('https://mccno.com/wp-content/uploads/events_json/full_calendar_json.json');
  const data = await res.json();
  console.log("MCCNO Total Events:", data.length);
  if (data.length > 0) {
    console.log("Sample MCCNO Event:", data[0]);
  }
}

async function testEncoreHtml() {
  console.log("\nTesting Encore HTML structure...");
  const res = await fetch('https://eventnow.encoreglobal.com/landingpage/newexhibit/index/');
  const html = await res.text();
  
  // Find all links or text blocks
  const matches = [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("Encore total links:", matches.length);
  
  // Filter links containing venue or event or exhibit
  const exhibitLinks = matches.filter(m => m[1].includes('index/?v=') || m[1].includes('newexhibit') || m[1].includes('event'));
  console.log("Exhibit links count:", exhibitLinks.length);
  exhibitLinks.slice(0, 10).forEach(m => {
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    console.log(`Text: "${text}" | Link: ${m[1]}`);
  });
}

async function run() {
  await testMCCNOJSON();
  await testEncoreHtml();
}

run().catch(console.error);
