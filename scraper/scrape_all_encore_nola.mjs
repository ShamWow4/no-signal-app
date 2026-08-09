import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    console.log("🚀 Starting comprehensive New Orleans Hotel Event Scraper...");
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let allEvents = [];
    const seenTitles = new Set();

    // Loop through pages until "Event not listed" is found or no event cards are present
    let p = 1;
    let maxPages = 30; // default fallback, will be updated from pager
    let consecutiveErrors = 0;
    while (p <= maxPages) {
        const pageUrl = `https://eventnow.encoreglobal.com/landingpage/newexhibit/index/?p=${p}`;
        console.log(`▶ Navigating to page ${p}/${maxPages}...`);

        try {
            await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.waitForSelector('.event-box, .exhibit-card, .event-card', { timeout: 10000 }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            const pageData = await page.evaluate(() => {
                const results = [];
                const cards = document.querySelectorAll('.event-box, .exhibit-card, .event-card, .shopping-card');

                cards.forEach(card => {
                    const text = card.textContent || '';
                    if (text.toUpperCase().includes('NEW ORLEANS')) {
                        let titleEl = card.querySelector('.event-name, h3, h4, .title, a');
                        let title = titleEl ? titleEl.textContent.trim() : '';

                        const venueEl = card.querySelector('.venue_link, .values, .venue-name, .location');
                        let venue = venueEl ? venueEl.textContent.trim() : '';

                        const items = Array.from(card.querySelectorAll('li'));
                        const datesLi = items.find(i => i.textContent.includes('Dates'));
                        let datesRaw = '';
                        if (datesLi) {
                            const valEl = datesLi.querySelector('.values');
                            datesRaw = valEl ? valEl.textContent.trim() : datesLi.textContent.replace(/Dates:?/i, '').trim();
                        } else {
                            datesRaw = card.textContent;
                        }

                        // Extract any MM/DD/YYYY, M/D/YYYY, MM/DD/YY, M/D/YY, or YYYY-MM-DD pattern
                        const dateMatches = datesRaw.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g) || datesRaw.match(/\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g);
                        let loadInDate = '';
                        let loadOutDate = '';
                        if (dateMatches && dateMatches.length >= 2) {
                            loadInDate = dateMatches[0];
                            loadOutDate = dateMatches[1];
                        } else if (dateMatches && dateMatches.length === 1) {
                            loadInDate = dateMatches[0];
                            loadOutDate = dateMatches[0];
                        } else if (datesRaw.includes('-') || datesRaw.includes('–') || datesRaw.includes('—') || datesRaw.toLowerCase().includes(' to ')) {
                            const parts = datesRaw.split(/[-–—]| to /i).map(s => s.trim());
                            if (parts.length >= 2) {
                                loadInDate = parts[0];
                                loadOutDate = parts[1];
                            }
                        }

                        if (title && venue) {
                            results.push({ title, venue, loadInDate, loadOutDate, city: 'NEW ORLEANS, LA' });
                        }
                    }
                });

                // Extract max page count from pagination control if available
                let detectedMaxPages = null;
                const lastPageLink = document.querySelector('.pages .item a.last span, .pages-items .item:nth-last-child(2) span');
                if (lastPageLink) {
                    const num = parseInt(lastPageLink.textContent.trim());
                    if (!isNaN(num) && num > 0) detectedMaxPages = num;
                }

                return { results, cardCount: cards.length, detectedMaxPages };
            });

            if (pageData.detectedMaxPages && pageData.detectedMaxPages !== maxPages) {
                maxPages = pageData.detectedMaxPages;
            }

            if (pageData.cardCount === 0) {
                console.log(`   🛑 Reached end of events on page ${p} (0 cards found). Stopping pagination.`);
                break;
            }

            const pageEvents = pageData.results;
            let addedCount = 0;
            if (pageEvents.length > 0) {
                for (const e of pageEvents) {
                    const key = `${e.title}_${e.venue}`.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (!seenTitles.has(key)) {
                        seenTitles.add(key);
                        allEvents.push(e);
                        addedCount++;
                    }
                }
                console.log(`   Found ${pageEvents.length} NOLA events on page ${p} (${addedCount} new)`);
            } else {
                console.log(`   Page ${p}: No NOLA events on this page (${pageData.cardCount} total cards)`);
            }

            consecutiveErrors = 0;
        } catch (err) {
            console.log(`   ⚠️ Skipping page ${p}: ${err.message}`);
            consecutiveErrors++;
            if (consecutiveErrors >= 3) {
                console.log(`   🛑 Too many consecutive errors. Stopping pagination.`);
                break;
            }
        }

        p++;
    }

    await browser.close();

    console.log(`\n✅ Total unique NOLA Hotel Events scraped: ${allEvents.length}`);

    // If 0 found via pagination fallback to existing TSV dataset to prevent data loss
    if (allEvents.length === 0 && fs.existsSync('new_orleans_events.tsv')) {
        console.log("ℹ️ Preserving existing hotel events dataset.");
        return;
    }

    const header = ['Title', 'Venue', 'Load-In Date', 'Load-Out Date', 'City'].join('\t') + '\n';
    const rows = allEvents.map(e => `${e.title.replace(/\t|\n/g, ' ')}\t${e.venue.replace(/\t|\n/g, ' ')}\t${e.loadInDate.replace(/\t|\n/g, ' ')}\t${e.loadOutDate.replace(/\t|\n/g, ' ')}\t${e.city}`).join('\n');
    fs.writeFileSync('new_orleans_events.tsv', header + rows);
    console.log(`Done! Exported ${allEvents.length} events to new_orleans_events.tsv.`);
})();
