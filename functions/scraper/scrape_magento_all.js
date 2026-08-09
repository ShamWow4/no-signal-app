import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log("Navigating to page...");
    await page.goto('https://eventnow.encoreglobal.com/landingpage/newexhibit/index/', {waitUntil: 'networkidle2'});
    
    console.log("Setting state to LA...");
    await page.evaluate(() => {
        window.jQuery('select[name="venue_state"]').val('LA').trigger('change');
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Clicking search...");
    await page.evaluate(() => {
        window.jQuery('#showResult').click();
    });
    
    console.log("Waiting for results...");
    await new Promise(r => setTimeout(r, 8000)); // wait 8 seconds for first page
    
    let allEvents = [];
    let hasNext = true;
    let pageNum = 1;
    
    while(hasNext) {
        console.log(`Processing page ${pageNum}...`);
        const html = await page.content();
        const $ = cheerio.load(html);
        
        $('.event-box').each((i, el) => {
            const name = $(el).find('.event-name').text().trim();
            const dates = $(el).find('.event-dates').text().trim();
            const city = $(el).find('.event-city').text().trim();
            const url = $(el).find('a.exhibitor-item').attr('href');
            
            allEvents.push({ name, dates, city, url });
        });
        
        const nextButton = await page.$('.action.next');
        if (nextButton) {
            console.log(`Clicking Next...`);
            // click and wait for navigation/ajax
            await nextButton.click();
            await new Promise(r => setTimeout(r, 8000));
            pageNum++;
        } else {
            hasNext = false;
        }
    }
    
    fs.writeFileSync('all_la_events.json', JSON.stringify(allEvents, null, 2));
    console.log(`Saved ${allEvents.length} events to all_la_events.json`);
    
    await browser.close();
})();
