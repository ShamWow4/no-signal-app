import fs from 'fs';
import * as cheerio from 'cheerio';
const html = fs.readFileSync('filtered_events_LA.html', 'utf8');
const $ = cheerio.load(html);
const paginationHtml = $('.pages').html() || $('.pagination').html() || $('ul.items.pages-items').html();
console.log(paginationHtml);
