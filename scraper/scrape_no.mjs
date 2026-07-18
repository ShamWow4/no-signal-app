import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    console.log("Starting browser...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    console.log("Navigating to EventNow...");
    await page.goto('https://eventnow.encoreglobal.com/landingpage/newexhibit/index/', {waitUntil: 'networkidle2'});
    
    console.log("Applying Advanced Search...");
    await page.evaluate(() => {
        // Clear keyword search
        const keyword = document.querySelector('#searchKeyword');
        if (keyword) keyword.value = '';
        
        // Open Advanced Search
        const advancedTab = document.querySelector('.advanced-search [data-role="title"]');
        if (advancedTab && advancedTab.getAttribute('aria-expanded') === 'false') {
            advancedTab.click();
        }
    });
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Set Dates
    await page.evaluate(() => {
        if (window.jQuery) {
            // Some datepickers require removing readonly temporarily
            window.jQuery('#startDate').removeAttr('readonly').val('07/06/2026').trigger('change');
            window.jQuery('#endDate').removeAttr('readonly').val('09/04/2026').trigger('change');
        }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Set State
    await page.evaluate(() => {
        if (window.jQuery) {
            window.jQuery('#state').val('LA').trigger('change');
        }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Set City
    await page.evaluate(() => {
        if (window.jQuery) {
            window.jQuery('#city').val('NEW ORLEANS').trigger('change');
        }
    });
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Click Show Results
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const showBtn = buttons.find(b => b.textContent.includes('Show results'));
        if (showBtn) {
            showBtn.click();
        } else {
            window.jQuery('#exhibit_search_form').submit();
        }
    });
    
    console.log("Waiting for results to load...");
    await new Promise(r => setTimeout(r, 6000)); 
    
    let allEvents = [];
    let hasNext = true;
    let pageNum = 1;
    
    while (hasNext) {
        console.log(`Scraping page ${pageNum}...`);
        
        const events = await page.evaluate(() => {
            const results = [];
            const buttons = document.querySelectorAll('button[id^="exhibitShopping_"], button[id^="no-event-modal-btn-"]');
            
            buttons.forEach(button => {
                let card = button.parentElement;
                while (card && !card.querySelector('.venue_link')) {
                    card = card.parentElement;
                }
                if (!card) return;
                
                let titleEl = card.querySelector('h3') || card.querySelector('h4') || card.querySelector('.title') || card.querySelector('.event-name');
                let title = titleEl ? titleEl.textContent.trim() : '';
                if (!title) {
                    const lines = card.textContent.split('\n').map(l => l.trim()).filter(Boolean);
                    title = lines[0] || '';
                }
                
                const venueEl = card.querySelector('.venue_link');
                let venue = venueEl ? venueEl.textContent.trim() : '';
                
                const labels = Array.from(card.querySelectorAll('label'));
                const datesLabel = labels.find(l => l.textContent.includes('Dates'));
                let dates = '';
                if (datesLabel) {
                    dates = datesLabel.nextSibling ? datesLabel.nextSibling.textContent.trim() : '';
                    if (!dates) {
                        dates = datesLabel.parentElement.textContent.replace(datesLabel.textContent, '').trim();
                    }
                }
                
                const cityLabel = labels.find(l => l.textContent.includes('City'));
                let city = '';
                if (cityLabel) {
                    city = cityLabel.nextSibling ? cityLabel.nextSibling.textContent.trim() : '';
                    if (!city) {
                        city = cityLabel.parentElement.textContent.replace(cityLabel.textContent, '').trim();
                    }
                }
                
                title = title.replace(/\s+/g, ' ');
                venue = venue.replace(/\s+/g, ' ');
                dates = dates.replace(/\s+/g, ' ');
                city = city.replace(/\s+/g, ' ');

                if (city.toUpperCase().includes('NEW ORLEANS')) {
                    let loadIn = dates;
                    let loadOut = dates;
                    if (dates.includes('-')) {
                        const parts = dates.split('-');
                        loadIn = parts[0].trim();
                        loadOut = parts[1].trim();
                    }
                    results.push({ title, venue, loadIn, loadOut, city });
                }
            });
            return results;
        });
        
        allEvents = allEvents.concat(events);
        console.log(`Found ${events.length} New Orleans events on page ${pageNum}. Total: ${allEvents.length}`);
        
        const nextPageNum = pageNum + 1;
        hasNext = await page.evaluate((next) => {
            const links = Array.from(document.querySelectorAll('a, button, li, span')).filter(el => el.textContent.trim() === String(next) && el.childElementCount === 0);
            
            for (let target of links) {
                if (target.tagName === 'A' || target.tagName === 'BUTTON') {
                    target.click();
                    return true;
                } else if (target.parentElement && target.parentElement.tagName === 'A') {
                    target.parentElement.click();
                    return true;
                } else if (target.parentElement && target.parentElement.parentElement && target.parentElement.parentElement.tagName === 'A') {
                    target.parentElement.parentElement.click();
                    return true;
                }
            }
            
            const arrows = Array.from(document.querySelectorAll('a, button')).filter(a => a.textContent.includes('>') || a.classList.contains('next'));
            for (let arrow of arrows) {
                if (!arrow.classList.contains('disabled')) {
                    arrow.click();
                    return true;
                }
            }
            return false;
        }, nextPageNum);
        
        if (hasNext) {
            pageNum++;
            console.log("Clicked next page, waiting for load...");
            await new Promise(r => setTimeout(r, 6000));
        }
    }
    
    await browser.close();
    
    console.log("Saving to new_orleans_events.tsv...");
    const header = ['Title', 'Venue', 'loadIn', 'loadOut', 'City'].join('\t') + '\n';
    const rows = allEvents.map(e => `${e.title}\t${e.venue}\t${e.loadIn}\t${e.loadOut}\t${e.city}`).join('\n');
    fs.writeFileSync('new_orleans_events.tsv', header + rows);
    console.log(`Done! Exported ${allEvents.length} events.`);
})();
