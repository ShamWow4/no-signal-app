import fs from 'fs';
import path from 'path';

/**
 * Clean & Deduplicate Technician CSV for Bulk SMS Platforms
 * 
 * Usage:
 *   node scripts/data_processing/clean_tech_csv.mjs [path_to_input.csv] [path_to_output.csv]
 * 
 * Example:
 *   node scripts/data_processing/clean_tech_csv.mjs techs.csv techs_cleaned.csv
 */

// Parse CSV line handling quotes
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Escape value for CSV export
function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Standardize phone number to E.164 (+15041234567) and US format ((504) 123-4567)
function cleanPhoneNumber(phoneStr) {
  if (!phoneStr) return null;
  
  // Extract all digits
  const digits = phoneStr.replace(/\D/g, '');
  
  let tenDigitNumber = '';
  
  if (digits.length === 10) {
    tenDigitNumber = digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    tenDigitNumber = digits.substring(1);
  } else {
    // Invalid length for standard US phone number
    return null;
  }

  const areaCode = tenDigitNumber.substring(0, 3);
  const prefix = tenDigitNumber.substring(3, 6);
  const line = tenDigitNumber.substring(6, 10);

  return {
    e164: `+1${tenDigitNumber}`,
    formatted: `(${areaCode}) ${prefix}-${line}`,
    rawDigits: tenDigitNumber,
  };
}

// Title case helper for names
function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function processTechCSV() {
  const args = process.argv.slice(2);
  const inputFile = args[0] || 'techs.csv';
  const outputFile = args[1] || 'techs_cleaned_for_sms.csv';

  const absoluteInputPath = path.isAbsolute(inputFile) 
    ? inputFile 
    : path.resolve(process.cwd(), inputFile);

  const absoluteOutputPath = path.isAbsolute(outputFile) 
    ? outputFile 
    : path.resolve(process.cwd(), outputFile);

  console.log(`\n==================================================`);
  console.log(`📱 NO SIGNAL - Technician CSV SMS Preparation Tool`);
  console.log(`==================================================\n`);
  console.log(`Reading input file: ${absoluteInputPath}`);

  if (!fs.existsSync(absoluteInputPath)) {
    console.error(`\n❌ Error: Input CSV file not found at "${absoluteInputPath}"`);
    console.log(`\nPlease specify the file path as an argument:`);
    console.log(`  node scripts/data_processing/clean_tech_csv.mjs my_techs.csv`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(absoluteInputPath, 'utf8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    console.error(`❌ Error: File is empty.`);
    process.exit(1);
  }

  const headers = parseCSVLine(lines[0]);
  console.log(`Headers found (${headers.length}):`, headers.join(', '));

  // Auto-detect columns
  let phoneColIdx = -1;
  let firstNameColIdx = -1;
  let lastNameColIdx = -1;
  let emailColIdx = -1;
  let roleColIdx = -1;

  headers.forEach((h, idx) => {
    const lower = h.toLowerCase().trim();
    if (phoneColIdx === -1 && (lower.includes('phone') || lower.includes('mobile') || lower.includes('cell') || lower.includes('contact') || lower.includes('number'))) {
      phoneColIdx = idx;
    }
    if (lower.includes('first') || (lower === '' && idx === 1 && headers.some(x => x.toLowerCase().includes('last')))) {
      firstNameColIdx = idx;
    }
    if (lower.includes('last')) {
      lastNameColIdx = idx;
    }
    if (emailColIdx === -1 && lower.includes('email')) {
      emailColIdx = idx;
    }
    if (roleColIdx === -1 && (lower.includes('role') || lower.includes('dept') || lower.includes('position') || lower.includes('skill') || lower.includes('type'))) {
      roleColIdx = idx;
    }
  });

  // Handle case where column 0 is role, column 1 is first name, column 2 is last name, column 3 is phone
  if (firstNameColIdx === -1 && lastNameColIdx !== -1) {
    if (lastNameColIdx > 0 && headers[lastNameColIdx - 1].trim() === '') {
      firstNameColIdx = lastNameColIdx - 1;
    }
  }

  if (phoneColIdx === -1) phoneColIdx = headers.length > 1 ? 3 : 0;

  console.log(`Detected Phone Column: "${headers[phoneColIdx] || 'Index ' + phoneColIdx}"`);
  console.log(`Detected First Name Column: "${firstNameColIdx !== -1 ? (headers[firstNameColIdx] || 'Index ' + firstNameColIdx) : 'None'}"`);
  console.log(`Detected Last Name Column:  "${lastNameColIdx !== -1 ? (headers[lastNameColIdx] || 'Index ' + lastNameColIdx) : 'None'}"`);

  const seenPhoneDigits = new Set();
  const cleanedRows = [];
  let duplicateCount = 0;
  let invalidPhoneCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length === 0) continue;

    let fullName = '';
    if (firstNameColIdx !== -1 && lastNameColIdx !== -1) {
      const fName = row[firstNameColIdx] || '';
      const lName = row[lastNameColIdx] || '';
      fullName = `${fName} ${lName}`.trim();
    } else if (firstNameColIdx !== -1) {
      fullName = row[firstNameColIdx] || '';
    } else if (lastNameColIdx !== -1) {
      fullName = row[lastNameColIdx] || '';
    } else {
      // Fallback
      fullName = row[0] || '';
    }

    const rawPhone = row[phoneColIdx] || '';
    const rawEmail = emailColIdx !== -1 ? (row[emailColIdx] || '') : '';
    const rawRole = roleColIdx !== -1 ? (row[roleColIdx] || '') : '';

    const phoneData = cleanPhoneNumber(rawPhone);

    if (!phoneData) {
      invalidPhoneCount++;
      continue;
    }

    if (seenPhoneDigits.has(phoneData.rawDigits)) {
      duplicateCount++;
      continue;
    }

    seenPhoneDigits.add(phoneData.rawDigits);

    cleanedRows.push({
      name: toTitleCase(fullName),
      e164_phone: phoneData.e164,
      formatted_phone: phoneData.formatted,
      email: rawEmail.trim().toLowerCase(),
      role: rawRole.trim().toUpperCase(),
    });
  }

  // Generate cleaned output CSV with standard SMS tool headers
  const outputHeaders = ['First/Full Name', 'Phone (E.164)', 'Phone (Formatted)', 'Email', 'Role/Skill'];
  const outputLines = [outputHeaders.join(',')];

  cleanedRows.forEach(item => {
    const line = [
      escapeCSV(item.name),
      escapeCSV(item.e164_phone),
      escapeCSV(item.formatted_phone),
      escapeCSV(item.email),
      escapeCSV(item.role),
    ].join(',');
    outputLines.push(line);
  });

  fs.writeFileSync(absoluteOutputPath, outputLines.join('\n'), 'utf8');

  console.log(`\n==================================================`);
  console.log(`✅ CLEANING COMPLETE! SUMMARY:`);
  console.log(`==================================================`);
  console.log(`📥 Total Rows Processed:  ${lines.length - 1}`);
  console.log(`📤 Unique Techs Exported: ${cleanedRows.length}`);
  console.log(`♻️ Duplicates Removed:    ${duplicateCount}`);
  console.log(`⚠️ Invalid Phones Skipped: ${invalidPhoneCount}`);
  console.log(`💾 Clean CSV Saved to:    ${absoluteOutputPath}`);
  console.log(`==================================================\n`);
}

processTechCSV().catch(err => {
  console.error("Error processing CSV:", err);
});
