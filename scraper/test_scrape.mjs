import fetch from 'node-fetch';

async function testMCCNO() {
  console.log("Testing MCCNO...");
  const res = await fetch('https://mccno.com/events/');
  const html = await res.text();
  console.log("MCCNO HTML length:", html.length);
  
  // Find all links or titles or event containers
  const matches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("Found links count:", matches.length);
  
  // Look for event-related links or classes
  const eventLinks = matches.filter(m => m[1].includes('/event') || m[0].includes('entry-title') || m[0].includes('event'));
  console.log("Sample event links:", eventLinks.slice(0, 10).map(m => ({ url: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() })));
}

async function testEncore() {
  console.log("\nTesting Encore...");
  const res = await fetch('https://eventnow.encoreglobal.com/landingpage/newexhibit/index/');
  const html = await res.text();
  console.log("Encore HTML length:", html.length);
  
  const matches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("Found links count:", matches.length);
  const sample = matches.filter(m => m[1].includes('newexhibit') || m[0].includes('product'));
  console.log("Sample Encore links:", sample.slice(0, 10).map(m => ({ url: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() })));
}

async function run() {
  await testMCCNO();
  await testEncore();
}

run();
