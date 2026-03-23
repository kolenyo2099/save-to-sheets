/**
 * Save to Sheets — Google Apps Script (v2)
 *
 * Deploy this as a Web App in your Google Sheet:
 *   Extensions → Apps Script → paste this → Deploy → New deployment
 *   Type: Web app | Execute as: Me | Access: Anyone
 *
 * Supports both the legacy fixed-column format and the new dynamic
 * column format set up via the extension's Advanced Features settings.
 */

// ── GET: return header row so the extension can detect columns ────────
function doGet(e) {
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastCol = sheet.getLastColumn();
  const headers = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    : [];
  return ContentService
    .createTextOutput(JSON.stringify({ headers: headers }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST: handle all write actions ───────────────────────────────────
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  let responseBody;

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data  = JSON.parse(e.postData.contents);

    // ── Action: getHeaders (used by "Detect from Sheet" button) ──────
    if (data.action === 'getHeaders') {
      const lastCol = sheet.getLastColumn();
      const headers = lastCol > 0
        ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
        : [];
      responseBody = JSON.stringify({ status: 'ok', headers: headers });

    // ── Action: setHeaders (used by "Apply to Sheet" button) ─────────
    } else if (data.action === 'setHeaders') {
      const h = data.headers || [];
      if (h.length > 0) {
        sheet.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
        SpreadsheetApp.flush();
      }
      responseBody = JSON.stringify({ status: 'ok' });

    // ── Action: data (dynamic column format) ─────────────────────────
    } else if (data.action === 'data' && Array.isArray(data.row)) {
      sheet.appendRow(data.row);
      SpreadsheetApp.flush();
      responseBody = JSON.stringify({ status: 'ok' });

    // ── Legacy format (no action field) ──────────────────────────────
    } else {
      sheet.appendRow([
        data.id      || '',
        new Date(),
        data.savedBy || '',
        data.query   || '',
        data.title   || '',
        data.url     || '',
        data.snippet || ''
      ]);
      SpreadsheetApp.flush();
      responseBody = JSON.stringify({ status: 'ok' });
    }

  } finally {
    lock.releaseLock();
  }

  return ContentService
    .createTextOutput(responseBody)
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Optional: add a header row if the sheet is brand new ─────────────
function onOpen() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID', 'Timestamp', 'Saved By', 'Query', 'Title', 'URL', 'Snippet']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
}
