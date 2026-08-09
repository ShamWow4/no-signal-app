import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs';
import 'dotenv/config';

// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwDZpwlxWyCTWfuSKfql9gtAgdZw704iC4m3hNldj-4YwY4p0yO6Zl7wNl8sZ54r5O2/exec';

(async () => {
    console.log("Starting Puppeteer crawler for eventnow.encoreglobal.com...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log("Navigating to page...");
    await page.goto('https://eventnow.encoreglobal.com/landingpage/newexhibit/index/', {waitUntil: 'networkidle2'});
    
    console.log("Setting state to LA...");
    await page.evaluate(() => {
        // Select Louisiana to filter down the events
        window.jQuery('select[name="venue_state"]').val('LA').trigger('change');
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Clicking search...");
    await page.evaluate(() => {
        window.jQuery('#showResult').click();
    });
    
    console.log("Waiting for results...");
    await new Promise(r => setTimeout(r, 8000)); // wait 8 seconds for first page
    
    let rawEvents = [];
    let hasNext = true;
    let pageNum = 1;
    
    while(hasNext) {
        console.log(`Processing page ${pageNum}...`);
        const html = await page.content();
        const $ = cheerio.load(html);
        
        $('.event-box').each((i, el) => {
            const name = $(el).find('.event-name').text().trim();
            
            let dates = '';
            let city = '';
            $(el).find('.event-details ul li').each((j, li) => {
                const text = $(li).text();
                if (text.includes('Dates:')) {
                    dates = text.replace('Dates:', '').trim();
                }
                if (text.includes('City:')) {
                    city = text.replace('City:', '').trim();
                }
            });

            const url = $(el).closest('form').attr('action') || $(el).find('a.venue_link').attr('href') || $(el).find('a').attr('href');
            
            rawEvents.push({ name, dates, city, url });
        });
        
        const nextButton = await page.$('.action.next');
        if (nextButton) {
            console.log(`Clicking Next...`);
            await nextButton.click();
            await new Promise(r => setTimeout(r, 8000));
            pageNum++;
        } else {
            hasNext = false;
        }
    }
    
    console.log(`\nExtracted a total of ${rawEvents.length} events in Louisiana.`);

    const filteredEvents = [];
    const seenNames = new Set();

    for (const event of rawEvents) {
        const city = event.city ? event.city.toLowerCase() : '';
        const isNolaArea = city.includes('new orleans') || 
                           city.includes('metairie') || 
                           city.includes('kenner') ||
                           city.includes('gretna') ||
                           city.includes('harvey') ||
                           city.includes('slidell');

        // Parse dates like "07/12/2026 06:00 pm-07/14/2026 10:00 pm"
        let loadIn = "";
        let loadOut = "";
        if (event.dates) {
            const parts = event.dates.split('-');
            if (parts.length >= 2) {
                loadIn = parts[0].trim();
                loadOut = parts[1].trim();
            } else {
                loadIn = event.dates;
            }
        }

        const formattedEvent = {
            name: event.name,
            venue: "", // Venue not easily accessible from listing, could scrape individual pages later if needed
            hall: event.city,
            loadIn: loadIn,
            loadOut: loadOut,
            type: "Convention", // Use convention as default
            url: event.url
        };

        // WE KEEP New Orleans events (as requested)
        if (!seenNames.has(formattedEvent.name) && isNolaArea) {
            seenNames.add(formattedEvent.name);
            filteredEvents.push(formattedEvent);
        }
    }

    console.log(`Filtered down to ${filteredEvents.length} unique events in the New Orleans area.`);

    // 2. Save to JSON
    fs.writeFileSync('all_scraped_events.json', JSON.stringify(filteredEvents, null, 2));
    console.log(`🎉 Saved to all_scraped_events.json`);

    // 3. Save to CSV
    if (filteredEvents.length > 0) {
        console.log('Generating CSV file...');
        const headers = ['Event Name', 'Venue', 'City/Hall', 'Load In', 'Load Out', 'Type', 'URL'];
        const escapeCsv = (val) => `"${(val || '').replace(/"/g, '""')}"`;

        const csvRows = [headers.map(escapeCsv).join(',')];

        for (const event of filteredEvents) {
            csvRows.push([
                event.name,
                event.venue,
                event.hall,
                event.loadIn,
                event.loadOut,
                event.type,
                event.url
            ].map(escapeCsv).join(','));
        }

        fs.writeFileSync('all_scraped_events.csv', csvRows.join('\n'));
        console.log('✅ Successfully saved to all_scraped_events.csv!');
    }

    // 4. Send to Google Sheets Webhook
    if (GOOGLE_SHEETS_WEBHOOK_URL && filteredEvents.length > 0) {
        console.log('\nSending data to Google Sheets...');
        try {
            const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: JSON.stringify(filteredEvents)
            });

            const result = await response.json();
            if (result.status === 'success') {
                console.log('✅ Successfully sent to Google Sheets!');
            } else {
                console.error('⚠️ Error from Google Sheets:', result.message);
            }
        } catch (err) {
            console.error('⚠️ Failed to send to Google Sheets:', err.message);
        }
    } else if (!GOOGLE_SHEETS_WEBHOOK_URL) {
        console.log('\n⚠️ No GOOGLE_SHEETS_WEBHOOK_URL provided. Skipping Google Sheets upload.');
    }
    
    await browser.close();
})();
