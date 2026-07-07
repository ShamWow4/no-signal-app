import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const allEvents = [];
  let currentPage = 1;
  const MAX_PAGES = 30; // Safety limit
  
  while (currentPage <= MAX_PAGES) {
    const url = `https://eventnow.encoreglobal.com/landingpage/newexhibit/index/?p=${currentPage}`;
    console.log(`\nNavigating to ${url}...`);
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const textContent = await page.evaluate(() => document.body.innerText);
    
    const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let i = 0;
    // Find "Upcoming Events" section
    while (i < lines.length && lines[i] !== 'Upcoming Events') {
      i++;
    }
    i++; // skip "Upcoming Events"
    
    let eventsOnThisPage = 0;
    
    while (i < lines.length) {
      // If we hit pagination, stop for this page
      if (lines[i] === 'Page' || lines[i].includes("You're currently reading page")) {
        break;
      }
      
      const name = lines[i];
      if (lines[i+1] === 'Venue:') {
        const venue = lines[i+2];
        if (lines[i+3] === 'Dates:') {
          const dates = lines[i+4];
          if (lines[i+5] === 'City:') {
            const city = lines[i+6];
            
            let nextIdx = i + 7;
            if (lines[nextIdx] === 'Shop for Event') {
              nextIdx++;
            }
            
            // Parse dates: "07/01/2026 08:00 am-07/08/2026 06:00 pm"
            let loadInStr = dates, loadOutStr = dates;
            if (dates.includes('-')) {
              [loadInStr, loadOutStr] = dates.split('-');
            }
            
            const parseDate = (dStr) => {
              if (!dStr) return "";
              const d = new Date(dStr);
              if (isNaN(d)) return dStr;
              const pad = (n) => n.toString().padStart(2, '0');
              return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            allEvents.push({
              name,
              venue,
              hall: city,
              loadIn: parseDate(loadInStr),
              loadOut: parseDate(loadOutStr),
              type: "Convention",
              url: "https://eventnow.encoreglobal.com"
            });
            
            eventsOnThisPage++;
            i = nextIdx;
            continue;
          }
        }
      }
      i++;
    }
    
    console.log(`Parsed ${eventsOnThisPage} events from page ${currentPage}`);
    
    // If no events were parsed on this page, we've likely hit the end of the results
    if (eventsOnThisPage === 0) {
      console.log('No events found on this page. Stopping crawler.');
      break;
    }
    
    currentPage++;
  }
  
  fs.writeFileSync('all_scraped_events.json', JSON.stringify(allEvents, null, 2));
  console.log(`\n🎉 Successfully scraped a total of ${allEvents.length} events! Saved to all_scraped_events.json`);
  
  await browser.close();
})();
