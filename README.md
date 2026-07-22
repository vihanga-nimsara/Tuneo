# Tuneo

A Chrome/Edge extension that identifies songs playing in browser tabs — built to replace Shazam's discontinued browser extension.

## How it works

- **Popup** (`src/popup`) — click the toolbar icon to open a compact 360x420 popup with a listen button, gradient animation, and recent matches (up to 10, or 25 in compact view).
- **Side panel** (`src/sidepanel`) — pin the popup to open the side panel, showing full match history with search, copy, CSV export, and clear.
- **Background service worker** (`src/background.ts`) — manages the offscreen document, calls the AudD recognition API, caches results, and saves matches to storage even when the popup is closed.
- **Offscreen document** (`src/offscreen`) — the only context allowed to hold a live `tabCapture` stream in Manifest V3; records an 8-second clip and hands it back.
- **In-page toast** — after recognition, a rich notification card (album art, title, artist, all platform links) slides in at the top-right of the current page.

Recognition is powered by [AudD](https://audd.io).

## Build

```bash
npm install
npm run build
```

Outputs a loadable extension to `dist/`.

## Load into Chrome/Edge

1. Go to `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder.
4. Click the extension icon, tap the listen button, and play audio in the active tab.

## Notes

- `npm run dev` runs Vite in watch mode — reload the unpacked extension in `chrome://extensions` after each rebuild.
- Results persist in `chrome.storage.local` (max 25 entries).
- The toolbar badge shows **♪** while listening.
