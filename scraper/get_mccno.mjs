import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    // Relax timeout and waitUntil
    await page.goto('https://mccno.com/events/', {waitUntil: 'domcontentloaded', timeout: 60000});
    await new Promise(r => setTimeout(r, 5000));
    const html = await page.content();
    fs.writeFileSync('mccno_events.html', html);
    await browser.close();
})();
