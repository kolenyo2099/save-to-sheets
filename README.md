# 💾 Save to Sheets — Chrome Extension

Save Google search results to a shared Google Spreadsheet with one click.

---

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked** and select this folder

---

## Setup (each user does this once)

### A) Create your Google Sheet backend

1. Open (or create) a Google Sheet you want to collect results in
2. Click **Extensions → Apps Script**
3. Delete any existing code and paste the contents of `apps-script.js`
4. Click **Save**, then **Deploy → New deployment**
5. Set: Type = *Web app*, Execute as = *Me*, Access = *Anyone*
6. Click **Deploy**, authorize when prompted
7. Copy the **Web App URL** you receive

### B) Configure the extension

1. Click the extension icon in Chrome → **Open Settings**
2. Enter your name (shown in the sheet as "Saved By")
3. Paste the Web App URL from step A
4. Click **Save settings**, then **Test connection** to verify

---

## Sharing with a team

Share the **Web App URL** with collaborators. Each person:
1. Installs the extension
2. Pastes the shared URL into their settings
3. Enters their own name

All saves appear in the same sheet with a **Saved By** column.

---

## Spreadsheet columns

| Timestamp | Saved By | Query | Title | URL | Snippet |
|-----------|----------|-------|-------|-----|---------|

Tip: add this as a header row manually in row 1 of your sheet.

---

## How it works

The extension injects a 💾 Save button next to each Google result. Clicking it sends the result data to a Google Apps Script web app that you deploy on your own Google account — no third-party servers, no OAuth setup, no data leaves your Google account.

Concurrent saves from multiple users are handled safely using `LockService` in the Apps Script.
