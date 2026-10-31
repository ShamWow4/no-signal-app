import fs from 'fs';

async function scrapeIATSE() {
  console.log('🔍 Fetching IATSE Local 39 Calendar (4-Month Rolling Window)...');
  
  const now = new Date();
  const monthsToFetch = 4;
  const rawEvents = [];

  for (let i = 0; i < monthsToFetch; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const yyyy = targetDate.getFullYear();
    const dateParam = `${mm}/01/${yyyy}`;
    
    const url = `https://www.iatse39.org/index.cfm?zone=/unionactive/calendar_list_month.cfm&thisdate=${dateParam}&useCalSection=main&setfullcal=0`;
    
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = await res.text();
      
      // Flexible regex: capture anchor text and look anywhere nearby for a Month Day, Year date string
      const linkRegex = /<a[^>]+href="[^"]*view_calendar\.cfm[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, '').trim();
        
        // Grab a 300-character window after the link to find the date text
        const snippet = html.slice(match.index, match.index + 400);
        const dateMatch = snippet.match(/([A-Za-z]{3}\s+\d{1,2},\s+\d{4})/);
        
        if (text && !text.match(/^\d+$/) && dateMatch) {
          const dateStr = dateMatch[1];
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            const y = parsedDate.getFullYear();
            const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const d = String(parsedDate.getDate()).padStart(2, '0');
            const isoDate = `${y}-${m}-${d}`;
            rawEvents.push({ title: text, isoDate });
          }
        }
      }
    } catch (err) {
      console.error(`❌ Error fetching ${dateParam}:`, err.message);
    }
  }

  const grouped = new Map();
  for (const ev of rawEvents) {
    const cleanTitle = ev.title.replace(/\s+/g, ' ').trim();
    const key = cleanTitle.toLowerCase();
    
    if (!grouped.has(key)) {
      let venue = 'IATSE Local 39';
      if (cleanTitle.includes('@')) {
        const afterAt = cleanTitle.split('@').slice(1).join('@').trim();
        venue = `IATSE 39 / ${afterAt.replace(/\s*\([^)]*\)\s*$/, '').trim()}`;
      }
      grouped.set(key, {
        title: cleanTitle,
        venue,
        loadIn: ev.isoDate,
        loadOut: ev.isoDate,
        city: 'NEW ORLEANS, LA',
        hall: 'Union Call'
      });
    } else {
      const existing = grouped.get(key);
      if (ev.isoDate < existing.loadIn) existing.loadIn = ev.isoDate;
      if (ev.isoDate > existing.loadOut) existing.loadOut = ev.isoDate;
    }
  }

  const uniqueEvents = Array.from(grouped.values()).sort((a, b) => a.loadIn.localeCompare(b.loadIn));
  console.log(`✅ Extracted ${rawEvents.length} daily entries -> grouped into ${uniqueEvents.length} unique IATSE events!`);
  if (uniqueEvents.length > 0) console.table(uniqueEvents.slice(0, 8));

  const header = ['Title', 'Venue', 'LoadIn', 'LoadOut', 'City', 'Hall'].join('\t') + '\n';
  const rows = uniqueEvents.map(e => `${e.title}\t${e.venue}\t${e.loadIn}\t${e.loadOut}\t${e.city}\t${e.hall}`).join('\n');
  fs.writeFileSync('iatse_events.tsv', header + rows);
  console.log('💾 Saved to iatse_events.tsv\n');
}

scrapeIATSE();
