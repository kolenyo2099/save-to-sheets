# 💾 Save to Sheets — Chrome Extension

Capture web pages and Google search results to a shared Google Spreadsheet. Designed as a lightweight archiving tool for research, investigation, and collaboration.

---

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked** and select this folder

---

## Setup

### Step 1: Deploy the Google Apps Script

1. Open (or create) a Google Sheet to use as your archive
2. Click **Extensions → Apps Script**
3. Delete any existing code and paste the contents of `apps-script.js`
4. Click **Save**, then **Deploy → New deployment**
5. Set: Type = *Web app*, Execute as = *Me*, Access = *Anyone*
6. Click **Deploy**, authorize when prompted
7. Copy the **Web App URL** you receive

### Step 2: Configure the extension

1. Click the extension icon in Chrome → **Open Settings**
2. Enter your name (shown in the sheet as "Saved By")
3. Paste the Web App URL from Step 1
4. Click **Save settings**, then **Test connection**

### Step 3 (optional): Configure custom columns

1. Go to **Advanced Features**
2. Either:
   - Click **Add column** to design your own structure, or
   - Click **Detect from Sheet** to import existing headers
3. Map each column to a data field
4. Click **Apply to Sheet** (writes the header row)
5. Save settings

If you skip Step 3, the extension uses the default 7-column structure.

---

## Collaborating with others

1. Share the **Web App URL** (not the sheet itself) with your team
2. Each person installs the extension and:
   - Pastes the Web App URL into settings
   - Enters their own name
   - Optionally imports the shared column structure via **Detect from Sheet**

All saves go to the same Google Sheet. The **Saved By** column shows who captured each item. Concurrent saves are handled safely with server-side locks.

---

## Default columns

If you don't configure a custom structure, the extension uses these 7 columns:

| ID | Timestamp | Saved By | Query | Title | URL | Snippet |
|---|---|---|---|---|---|---|

The **Query** field is only populated when saving from Google Search results.

**Customize:** Use the **Advanced Features** section in settings to design your own columns and choose which fields to capture.

---

## How it works

**On Google Search:** The extension injects a 💾 floppy disk button next to each result. Click to save.

**On any web page:** Right-click → **Save page to Sheets** to capture the page title, URL, and text snippet.

Data goes to a Google Apps Script web app that **you deploy on your own Google account** — no third-party servers, no OAuth, no data leaves your control. Concurrent saves from multiple users are handled safely using `LockService`.

### Advanced features

- **Custom columns:** Design your spreadsheet structure in the settings. Map each column to captured data fields (title, URL, snippet, query, etc.)
- **Auto-detect:** Import column headers from an existing sheet
- **Field mapping:** Choose what information gets captured and where it goes in your sheet
- **Default structure:** If not configured, defaults to: ID | Timestamp | Saved By | Query | Title | URL | Snippet
