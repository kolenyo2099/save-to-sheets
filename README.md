# 💾 Save to Sheets — Chrome Extension

Capture web pages, Google search results, and tweets to a shared Google Spreadsheet. Designed as a lightweight archiving and bookmarking tool for research, investigation, and collaboration.

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

## Available data fields

The extension can capture different information depending on the source:

**Common fields** (all sources):
- `ID`, `Timestamp`, `Saved By`, `Domain`

**Google Search results:**
- `Query`, `Result Title`, `Result URL`, `Result Snippet`, `Position`

**Tweets (X.com):**
- `Tweet ID`, `Tweet Text`, `Tweet Date/Time`, `Author Name`, `Author @handle`

**YouTube Videos:**
- `Video ID`, `Video Title`, `Video URL`, `Channel Name`, `Channel URL`, `View Count`, `Video Description`, `Upload Date`, `Duration`

**Facebook Posts:**
- `Post ID`, `Post URL`, `Post Text`, `Author Name`, `Post Date`, `Reaction Count`

**Web pages:**
- `Page Title`, `Page URL`, `Page Selection/Description`, `Meta Description`, `OG Title`, `OG Description`, `OG Type`, `Author`, `Publish Date`, `Canonical URL`, `Language`

## Default columns

If you don't configure a custom structure, the extension uses these 7 columns:

| ID | Timestamp | Saved By | Query | Title | URL | Snippet |
|---|---|---|---|---|---|---|

This default works well for Google Search results. For tweets, videos, posts, or web pages, you'll want to create a custom structure.

**Customize:** Use the **Advanced Features** section in settings to design your own columns and choose which fields to capture from each source.

---

## How it works

**On Google Search:** The extension injects a 💾 floppy disk button next to each result. Click to save the result with query, title, URL, and snippet.

**On X.com/Twitter:** The extension injects a 💾 floppy disk button in the action bar of each tweet. Click to save the tweet text, author, date, and URL.

**On YouTube:** A 💾 button appears in the video action bar. Click to save video metadata, including views, channel info, and description.

**On Facebook:** A 💾 button is added to the post action bar (on post-specific pages/permalinks). Click to save post content, author, and reaction counts.

**On any web page:** Right-click → **Save page to Sheets** to capture the page title, URL, and text snippet.

Data goes to a Google Apps Script web app that **you deploy on your own Google account** — no third-party servers, no OAuth, no data leaves your control. Concurrent saves from multiple users are handled safely using `LockService`.

### Advanced features

- **Custom columns:** Design your spreadsheet structure in the settings. Create, edit, or remove columns, then map each to a data field from Google Search, tweets, YouTube, Facebook, web pages, or shared metadata.
- **Auto-detect:** Import column headers from an existing sheet and reuse them in the extension settings.
- **Field mapping:** Choose exactly what gets captured and where it goes. The extension only sends the fields you've mapped — nothing extra.
- **Mixed sources:** Build one spreadsheet that mixes tweets, search results, videos, and web pages. Each source populates its relevant fields; unmapped columns remain empty.
- **Default structure:** If not configured, defaults to: ID | Timestamp | Saved By | Query | Title | URL | Snippet (designed for Google Search results)
