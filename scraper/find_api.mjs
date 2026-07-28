import fs from 'fs';

const mccno = fs.readFileSync('scraper/mccno_dump.html', 'utf8');
const encore = fs.readFileSync('scraper/encore_dump.html', 'utf8');

console.log("--- MCCNO ANALYSIS ---");
// Check for API endpoints in MCCNO
const apis = [...mccno.matchAll(/https?:[\\\/]+[^\s"']+(?:api|json|event|wp-json)[^\s"']*/gi)];
console.log("MCCNO API matches:", Array.from(new Set(apis.map(a => a[0]))));

// Check for event items in HTML structure
const mccnoItems = [...mccno.matchAll(/<div[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
console.log("MCCNO event div count:", mccnoItems.length);

console.log("\n--- ENCORE ANALYSIS ---");
// Look for products/exhibits in Encore
const encoreProducts = [...encore.matchAll(/class="product-item-link"[^>]*href="([^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/gi)];
console.log("Encore products count:", encoreProducts.length);
encoreProducts.slice(0, 10).forEach(p => {
  console.log("Product:", p[2].trim(), "| URL:", p[1]);
});

// Also check for event items in Encore
const encoreItemNames = [...encore.matchAll(/class="[^"]*product-item-name[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
console.log("Encore item names count:", encoreItemNames.length);
