import puppeteer from 'puppeteer';
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('https://eventnow.encoreglobal.com/landingpage/newexhibit/index/', {waitUntil: 'networkidle2'});
    
    // Clear input
    await page.evaluate(() => {
        const input = document.querySelector('#searchKeyword');
        if(input) input.value = '';
    });
    
    await page.type('#searchKeyword', 'New Orleans');
    await page.click('button.search-button');
    await new Promise(r => setTimeout(r, 5000));
    
    const html = await page.evaluate(() => {
        const page2 = Array.from(document.querySelectorAll('a, button, span')).find(el => el.textContent.trim() === '2' && el.childElementCount === 0);
        if (page2) return page2.parentElement.parentElement.outerHTML;
        
        return 'PAGINATION NOT FOUND';
    });
    console.log("PAGINATION HTML:");
    console.log(html);
    await browser.close();
})();
