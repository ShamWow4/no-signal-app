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
        const pages = document.querySelector('.pages');
        if (pages) return pages.outerHTML;
        
        // fallback try to find something with pagination
        const anyPagination = document.querySelector('[class*="page"], [class*="pagination"]');
        return anyPagination ? anyPagination.outerHTML : 'NO PAGES FOUND';
    });
    console.log("PAGINATION HTML:");
    console.log(html);
    await browser.close();
})();
