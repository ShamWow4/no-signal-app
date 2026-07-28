import fetch from 'node-fetch';

async function run() {
  const url = 'https://www.iatse39.org/index.cfm?zone=/unionactive/calendar_list_month.cfm&thisdate=07/01/2026&useCalSection=main&setfullcal=0';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();

  const regex = /<a[^>]+href="([^"]*view_calendar\.cfm[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const events = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    const rawLink = match[1];
    const link = 'https://www.iatse39.org/' + rawLink.replace(/&amp;/g, '&');
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    
    // Extract date from URL parameter (thisdate=MM/DD/YYYY or startdate=MM/DD/YYYY)
    const dateMatch = rawLink.match(/(?:thisdate|startdate)=(\d{2}\/\d{2}\/\d{4})/i);
    const date = dateMatch ? dateMatch[1] : '';

    if (text && !text.match(/^\d+$/)) {
      events.push({
        date: date,
        title: text,
        link: link,
        venue: 'IATSE Local 39',
        description: 'Union Event / Call'
      });
    }
  }

  console.log(`Extracted ${events.length} union events.`);
  events.slice(0, 10).forEach((e, idx) => {
    console.log(`${idx+1}. Date: ${e.date} | Title: "${e.title}" | Link: ${e.link}`);
  });
}

run().catch(console.error);
