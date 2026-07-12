import puppeteer from 'puppeteer';
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('https://eventnow.encoreglobal.com/landingpage/newexhibit/index/', {waitUntil: 'networkidle2'});
    
    await page.evaluate(() => {
        const input = document.querySelector('#searchKeyword');
        if(input) input.value = '';
    });
    
    await page.type('#searchKeyword', 'New Orleans');
    await page.click('button.search-button');
    await new Promise(r => setTimeout(r, 5000));
    
    const count = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button[id^="exhibitShopping_"], button[id^="no-event-modal-btn-"]');
        return buttons.length;
    });
    console.log(`TOTAL BUTTONS FOUND: ${count}`);
    await browser.close();
})();
