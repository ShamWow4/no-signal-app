import fetch from 'node-fetch';

async function testIATSE() {
  const url = 'https://www.iatse39.org/index.cfm?zone=/unionactive/calendar_list_month.cfm&thisdate=07/01/2026&useCalSection=main&setfullcal=0';
  console.log("Fetching IATSE Local 39 Calendar...");
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  console.log("HTML length:", html.length);

  // Look for event links or calendar entries
  const matches = [...html.matchAll(/<a[^>]+href="([^"]*calendar[^\"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("Found calendar links:", matches.length);
  matches.slice(0, 15).forEach(m => {
    console.log("Link:", m[1], "| Text:", m[2].replace(/<[^>]+>/g, '').trim());
  });

  // Look for table rows or event boxes
  const eventRows = [...html.matchAll(/<td[^>]*class="[^"]*cal[^"]*"[^>]*>([\s\S]*?)<\/td>/gi)];
  console.log("\nFound cal cells:", eventRows.length);
}

testIATSE().catch(console.error);
