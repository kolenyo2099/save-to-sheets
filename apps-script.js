/**
 * Save to Sheets — Google Apps Script
 *
 * Deploy this as a Web App in your Google Sheet:
 *   Extensions → Apps Script → paste this → Deploy → New deployment
 *   Type: Web app | Execute as: Me | Access: Anyone
 */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // wait up to 10 seconds to acquire the lock

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data  = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.id       || '', // ID
      new Date(),          // Timestamp
      data.savedBy  || '', // Saved By
      data.query    || '', // Search Query
      data.title    || '', // Page Title
      data.url      || '', // URL
      data.snippet  || ''  // Snippet / Description
    ]);

    SpreadsheetApp.flush(); // force write before releasing lock

  } finally {
    lock.releaseLock();
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Optional: add a header row if the sheet is empty
function onOpen() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID', 'Timestamp', 'Saved By', 'Search Query', 'Title', 'URL', 'Snippet']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
}
