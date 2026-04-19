/**
 * Save to Sheets — Google Apps Script (v3)
 *
 * Deploy this as a Web App in your Google Sheet:
 *   Extensions → Apps Script → paste this → Deploy → New deployment
 *   Type: Web app | Execute as: Me | Access: Anyone
 *
 * What's new in v3:
 *   - doGet returns available sheet/tab names so the extension can list them.
 *   - All write actions accept an optional `sheetName` field to target a
 *     specific tab. Falls back to the first sheet if omitted.
 */

// ── Helper: resolve a sheet by name or fall back to first sheet ────────
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (name) {
    const s = ss.getSheetByName(name);
    if (s) return s;
  }
  return ss.getSheets()[0];
}

// ── GET: return sheet tabs + headers so the extension can detect columns ─
function doGet(e) {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets().map(s => s.getName());

  // Optionally read headers from a specific tab
  const requestedName = e && e.parameter && e.parameter.sheetName;
  const sheet   = getSheet(requestedName);
  const lastCol = sheet.getLastColumn();
  const headers = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    : [];

  return ContentService
    .createTextOutput(JSON.stringify({ sheets: sheets, headers: headers }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST: handle all write actions ────────────────────────────────────
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  let responseBody;

  try {
    const data  = JSON.parse(e.postData.contents);
    const sheet = getSheet(data.sheetName);

    // ── Action: getSheets — return list of tab names ──────────────────
    if (data.action === 'getSheets') {
      const names = SpreadsheetApp.getActiveSpreadsheet()
        .getSheets().map(s => s.getName());
      responseBody = JSON.stringify({ status: 'ok', sheets: names });

    // ── Action: getHeaders (used by "Detect from Sheet" button) ──────
    } else if (data.action === 'getHeaders') {
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

    // ── Action: data — name-keyed rowData (current format) ───────────
    } else if (data.action === 'data' && data.rowData && typeof data.rowData === 'object') {
      const lastCol = sheet.getLastColumn();
      const headers = lastCol > 0
        ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String)
        : [];
      const rowArr = headers.map(h => {
        const trimmed = h.trim();
        return (trimmed && Object.prototype.hasOwnProperty.call(data.rowData, trimmed))
          ? data.rowData[trimmed]
          : '';
      });
      sheet.appendRow(rowArr.length > 0 ? rowArr : Object.values(data.rowData));
      SpreadsheetApp.flush();
      responseBody = JSON.stringify({ status: 'ok' });

    // ── Action: data — positional row array (legacy / fallback) ──────
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

// ── Optional: add a header row if the first sheet is brand new ────────
function onOpen() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID', 'Timestamp', 'Saved By', 'Query', 'Title', 'URL', 'Snippet']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
}
