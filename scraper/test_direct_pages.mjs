import fetch from 'node-fetch';

async function fetchPage(p) {
  const url = `https://eventnow.encoreglobal.com/landingpage/newexhibit/index/?p=${p}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  
  // Extract event titles & venues
  const events = [];
  const cardRegex = /<div[^>]*class="[^"]*exhibit-card[^"]*"[^>]*>([\s\S]*?)<\/div\s*>/gi;
  
  // Match links containing /landingpage/newexhibit/index/?v=
  const venueRegex = /<a[^>]*href="([^"]*[\?&]v=[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = venueRegex.exec(html)) !== null) {
    const title = match[2].replace(/<[^>]+>/g, '').trim();
    if (title && !title.toLowerCase().includes('exhibitor')) {
      events.push({ title, link: match[1] });
    }
  }
  return events;
}

(async () => {
  console.log("Testing direct URL page fetch...");
  for (let p = 1; p <= 5; p++) {
    const events = await fetchPage(p);
    console.log(`Page ${p}: found ${events.length} items`);
  }
})();
