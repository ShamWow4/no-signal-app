/**
 * ============================================================================
 * NOLA VISUAL ARTS & AV ACADEMY - GOOGLE APPS SCRIPT FOR MASTER DATA SHEET
 * ============================================================================
 * Paste this script into your Google Sheet: Extensions -> Apps Script -> Code.gs
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 NOLA A/V Pipeline')
    .addItem('✨ Auto-Format All Sheets', 'autoFormatSheets')
    .addItem('🧹 Clean & Deduplicate Calendar Data', 'cleanAndDeduplicateAllTabs')
    .addToUi();
}

/**
 * Auto-formats all sheets with NOLA A/V Branding (Dark/Gold headers, bold text, auto-fit columns)
 */
function autoFormatSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();

  sheets.forEach(function(sheet) {
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    
    if (lastRow === 0 || lastCol === 0) return;

    // Format Header Row
    var headerRange = sheet.getRange(1, 1, 1, lastCol);
    headerRange.setBackground('#1A1A1A')
               .setFontColor('#D4AF37')
               .setFontWeight('bold')
               .setFontFamily('Open Sans')
               .setFontSize(10)
               .setHorizontalAlignment('left');

    sheet.setFrozenRows(1);
    
    // Auto-fit column widths
    for (var col = 1; col <= lastCol; col++) {
      sheet.autoResizeColumn(col);
    }
  });

  SpreadsheetApp.getUi().alert('✅ Sheet Auto-Formatting Complete!');
}

/**
 * Normalizes dates to YYYY-MM-DD
 */
function parseToISODate(dateStr) {
  if (!dateStr) return '';
  dateStr = dateStr.toString().trim();
  
  // Match YYYY-MM-DD
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

  // Match MM/DD/YYYY or M/D/YYYY
  var mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mmddyyyy) {
    var m = mmddyyyy[1].padStart(2, '0');
    var d = mmddyyyy[2].padStart(2, '0');
    var y = mmddyyyy[3];
    return y + '-' + m + '-' + d;
  }

  var parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return dateStr;
}

/**
 * Standardizes Master Calendar, NOMCC, and Hotels tabs with 7-column schema:
 * Title | Venue | Hall / Room | Load-In Date | Load-Out Date | City | Source
 */
function cleanAndDeduplicateAllTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName('Master Calendar') || ss.getSheetByName('Master calendar') || ss.getSheetByName('calendar_events');

  if (!masterSheet) return;

  var lastRow = masterSheet.getLastRow();
  if (lastRow <= 1) return;

  var range = masterSheet.getRange(2, 1, lastRow - 1, 7);
  var values = range.getValues();

  var seen = {};
  var cleanRows = [];

  values.forEach(function(row) {
    var title = (row[0] || '').toString().trim();
    if (!title) return;

    var venue = (row[1] || '').toString().trim();
    var hall = (row[2] || '').toString().trim();
    var loadIn = parseToISODate(row[3]);
    var loadOut = parseToISODate(row[4]);
    var city = (row[5] || 'NEW ORLEANS, LA').toString().trim();
    var source = (row[6] || 'Scraped').toString().trim();

    var uniqueKey = (title + '_' + venue).toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!seen[uniqueKey]) {
      seen[uniqueKey] = true;
      cleanRows.push([title, venue, hall, loadIn, loadOut, city, source]);
    }
  });

  // Clear existing content and rewrite clean rows
  masterSheet.getRange(2, 1, masterSheet.getLastRow(), 7).clearContent();
  if (cleanRows.length > 0) {
    masterSheet.getRange(2, 1, cleanRows.length, 7).setValues(cleanRows);
  }

  autoFormatSheets();
}

/**
 * Webhook endpoint for Firecrawl / Node.js scrapers to POST scraped JSON data directly
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var targetTab = data.tab || 'calendar_events';
    var rows = data.rows || [];

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(targetTab);

    if (!sheet) {
      sheet = ss.insertSheet(targetTab);
    }

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', rowsAdded: rows.length }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
