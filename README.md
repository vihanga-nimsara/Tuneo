# Tuneo

A Chrome/Edge side-panel extension that identifies the song playing in the current tab — built to replace Shazam's discontinued browser extension.

## How it works

- **Side panel UI** (`src/sidepanel`) — React app: listen button, live waveform, and a
  card-based result view (collapsed row → expanded detail card with album, release date,
  label, and streaming links).
- **Background service worker** (`src/background.ts`) — opens the side panel, spins up the
  offscreen document, and calls the AudD recognition API.
- **Offscreen document** (`src/offscreen`) — the only context allowed to hold a live
  `tabCapture` stream in Manifest V3; records an 8-second clip and hands it back.

Recognition is powered by [AudD](https://audd.io) — get a free API token there and paste it
into the extension's Settings panel (gear icon) on first use.

## Build

```bash
npm install
npm run build
```

This outputs a loadable extension to `dist/`.

## Load into Chrome/Edge

1. Go to `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder.
4. Click the extension icon to open the side panel, add your AudD API key, play audio in
   a tab, then hit **Shazam this tab**.

## Notes

- `npm run dev` runs Vite in watch mode — reload the unpacked extension in
  `chrome://extensions` after each rebuild to pick up changes.
- The placeholder toolbar icons in `public/icons/` are generated solids — swap them for your
  own artwork whenever you're ready.
- Tab audio is routed back to the tab's speakers during capture, so playback doesn't mute.
