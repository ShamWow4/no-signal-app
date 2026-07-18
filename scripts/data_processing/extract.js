const fs = require('fs');
const text = fs.readFileSync('C:\\Users\\Shime\\.gemini\\antigravity-ide\\brain\\0cbe47a1-66a0-4fd1-9044-5d628e2f9987\\.system_generated\\logs\\transcript_full.jsonl', 'utf-8');
const lines = text.split('\n');

let outputLines = [];

function processContent(content) {
  if (!content) return;
  const contentLines = content.split(/\r?\n/);
  for (const l of contentLines) {
    const match = l.match(/^(\d+):\s(.*)/);
    if (match) {
      const lineNum = parseInt(match[1]);
      outputLines[lineNum - 1] = match[2];
    }
  }
}

for (let i=0; i<lines.length; i++) {
  if (!lines[i]) continue;
  const obj = JSON.parse(lines[i]);
  // We parse up to line 385 to get the rest of CalendarScreen
  if (i > 385) break;
  if (obj.content && obj.content.includes('CalendarScreen.js')) {
    processContent(obj.content);
  }
}

// Remove empty elements which might be undefined
for(let i=0; i<outputLines.length; i++) {
  if(outputLines[i] === undefined) {
    outputLines[i] = '';
  }
}

fs.writeFileSync('src/screens/CalendarScreen.js', outputLines.join('\n'));
console.log('Successfully wrote CalendarScreen.js with ' + outputLines.length + ' lines.');
