import fetch from 'node-fetch';

async function testEncorePage(url) {
  const res = await fetch(url);
  const html = await res.text();
  
  // Extract all venue links on the page
  const regex = /<a[^>]*href="(https:\/\/eventnow\.encoreglobal\.com\/landingpage\/newexhibit\/index\/\?v=[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const items = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const venueName = match[2].replace(/<[^>]+>/g, '').trim();
    if (venueName && !venueName.toLowerCase().includes('exhibitor')) {
      items.push({
        title: venueName,
        link: match[1],
        venue: 'Encore Global - ' + venueName,
        date: new Date().toLocaleDateString('en-US'),
        description: 'Encore Global Event Exhibit Venue'
      });
    }
  }
  return items;
}

async function run() {
  const pages = [
    'https://eventnow.encoreglobal.com/landingpage/newexhibit/index/',
    'https://eventnow.encoreglobal.com/landingpage/newexhibit/index/?p=2',
    'https://eventnow.encoreglobal.com/landingpage/newexhibit/index/?p=3'
  ];

  let total = [];
  for (const page of pages) {
    const res = await testEncorePage(page);
    console.log(`Page ${page} returned ${res.length} items.`);
    total = total.concat(res);
  }

  console.log(`Total Encore items across 3 pages: ${total.length}`);
  console.log("Sample Encore items:", total.slice(0, 5));
}

run().catch(console.error);
