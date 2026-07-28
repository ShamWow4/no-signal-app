import fetch from 'node-fetch';
import fs from 'fs';

async function run() {
  // MCCNO
  const mccnoRes = await fetch('https://mccno.com/events/');
  const mccnoHtml = await mccnoRes.text();
  fs.writeFileSync('scraper/mccno_dump.html', mccnoHtml);
  
  // Encore
  const encoreRes = await fetch('https://eventnow.encoreglobal.com/landingpage/newexhibit/index/');
  const encoreHtml = await encoreRes.text();
  fs.writeFileSync('scraper/encore_dump.html', encoreHtml);

  // Search MCCNO for event array/JSON
  const mccnoScripts = [...mccnoHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  console.log("MCCNO script tags count:", mccnoScripts.length);
  mccnoScripts.forEach((s, idx) => {
    if (s[1].includes('webAddress') || s[1].includes('data') || s[1].includes('eventName') || s[1].includes('Title')) {
      console.log(`MCCNO Script #${idx} snippet:`, s[1].slice(0, 300));
    }
  });

  // Search Encore for event list items
  const encoreCards = [...encoreHtml.matchAll(/<li[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)];
  console.log("\nEncore cards count:", encoreCards.length);
  if (encoreCards.length > 0) {
    console.log("Encore card sample:", encoreCards[0][1].slice(0, 300));
  }
}

run();
