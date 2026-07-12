import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.goto('https://eventnow.encoreglobal.com/landingpage/newexhibit/index/', {waitUntil: 'networkidle2'});
    
    await page.evaluate(() => {
        const keyword = document.querySelector('#searchKeyword');
        if (keyword) keyword.value = '';
        
        const advancedTab = document.querySelector('.advanced-search [data-role="title"]');
        if (advancedTab && advancedTab.getAttribute('aria-expanded') === 'false') {
            advancedTab.click();
        }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
        window.jQuery('#state').val('LA').trigger('change');
    });
    await new Promise(r => setTimeout(r, 2000));
    
    await page.evaluate(() => {
        window.jQuery('#city').val('NEW ORLEANS').trigger('change');
    });
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const showBtn = buttons.find(b => b.textContent.includes('Show results'));
        if (showBtn) {
            showBtn.click();
        } else {
            console.log("SHOW RESULTS NOT FOUND!");
            document.querySelector('#exhibit_search_form').submit();
        }
    });
    
    await new Promise(r => setTimeout(r, 5000)); 
    
    const count = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button[id^="exhibitShopping_"], button[id^="no-event-modal-btn-"]');
        return buttons.length;
    });
    console.log(`EVENTS ON PAGE 1: ${count}`);
    
    const firstCity = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label'));
        const cityLabel = labels.find(l => l.textContent.includes('City'));
        if (cityLabel) {
            let city = cityLabel.nextSibling ? cityLabel.nextSibling.textContent.trim() : '';
            if (!city) city = cityLabel.parentElement.textContent.replace(cityLabel.textContent, '').trim();
            return city;
        }
        return '';
    });
    console.log(`FIRST EVENT CITY: ${firstCity}`);
    
    await browser.close();
})();
