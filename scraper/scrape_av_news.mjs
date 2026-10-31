import fs from 'fs';

async function scrapeNews() {
  console.log('🔍 Fetching multi-source AV and New Orleans industry news...');
  
  const rawArticles = [];

  // 1. Fetch AVNetwork RSS / Feed
  try {
    const res = await fetch('https://www.avnetwork.com/rss');
    const text = await res.text();
    // Simple regex parser for RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const dateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch) {
        rawArticles.push({
          title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
          url: linkMatch[1].trim(),
          source: 'AV Network',
          date: dateMatch ? new Date(dateMatch[1]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
      }
    }
  } catch (err) {
    console.error('⚠️ AVNetwork fetch skipped:', err.message);
  }

  // 2. Fetch Live Design Online Feed
  try {
    const res = await fetch('https://www.livedesignonline.com/rss');
    const text = await res.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const dateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch) {
        rawArticles.push({
          title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
          url: linkMatch[1].trim(),
          source: 'Live Design Online',
          date: dateMatch ? new Date(dateMatch[1]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
      }
    }
  } catch (err) {
    console.error('⚠️ Live Design fetch skipped:', err.message);
  }

  console.log(`✅ Fetched ${rawArticles.length} total raw articles across feeds.`);

  // 3. Filter for Relevance (AV technology, live production, or New Orleans local context)
  const avKeywords = [
    'av', 'audio', 'video', 'sound', 'lighting', 'projection', 'stage', 'conventions', 
    'switch', 'display', 'signage', 'concert', 'theater', 'production', 'technician', 'union', 'iatse', 'mccno'
  ];
  
  const nolaKeywords = ['new orleans', 'nola', 'louisiana', 'convention center', 'mccno', 'saenger', 'jazz fest', 'mardi gras'];

  const filteredArticles = rawArticles.filter(art => {
    const t = art.title.toLowerCase();
    const hasAv = avKeywords.some(kw => t.includes(kw));
    const hasNola = nolaKeywords.some(kw => t.includes(kw));
    
    // Keep if it's general high-level AV tech news OR specifically tied to New Orleans
    return hasAv || hasNola;
  });

  console.log(`🎯 Filtered down to ${filteredArticles.length} relevant industry/local articles.`);
  if (filteredArticles.length > 0) {
    console.table(filteredArticles.slice(0, 10));
  }

  // 4. Save to av_news.tsv for Google Sheets & Firebase Pipeline
  // Expected columns matching your pipeline: Title, Source, Date, URL
  const header = ['Title', 'Source', 'Date', 'URL'].join('\t') + '\n';
  const rows = filteredArticles.map(a => `${a.title}\t${a.source}\t${a.date}\t${a.url}`).join('\n');
  fs.writeFileSync('av_news.tsv', header + rows);
  console.log('💾 Saved structured data to av_news.tsv');
}

scrapeNews();
