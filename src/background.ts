/// <reference types="chrome" />

const AUDD_API_KEY = "ed467ff6226471122f61e1b665b01bc2";
const OFFSCREEN_URL = "src/offscreen/index.html";

const resultCache = new Map<string, { result: any; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

function cacheKey(result: any): string {
  return result?.title && result?.artist ? `${result.title}|${result.artist}` : "";
}

async function saveResult(result: any) {
  const { history = [] } = await chrome.storage.local.get(["history"]);
  const entry = { id: crypto.randomUUID(), track: result, matchedAt: Date.now() };
  const next = [entry, ...history].slice(0, 25);
  await chrome.storage.local.set({ history: next });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
});

function setBadgeListening() {
  chrome.action.setBadgeText({ text: "♪" });
  chrome.action.setBadgeBackgroundColor({ color: "#4b3aff" });
}

function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
}

async function hasOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
  });
  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: "Capture tab audio to identify the currently playing song."
  });
}

function friendlyError(msg: string | undefined): string {
  if (!msg) return "Could not identify the song. Try again.";
  if (msg.includes("audio fingerprint")) return "Could not identify the song. Make sure audio is playing clearly in the active tab and try again.";
  if (msg.includes("file")) return "Could not identify the song. Try again with clearer audio.";
  return msg;
}

async function recognize(base64Audio: string) {
  const audioBlob = await (await fetch(base64Audio)).blob();
  const form = new FormData();
  form.append("api_token", AUDD_API_KEY);
  form.append("file", audioBlob, "clip.webm");
  form.append("return", "spotify,apple_music,deezer");

  const res = await fetch("https://api.audd.io/recognize", {
    method: "POST",
    body: form
  });

  if (!res.ok) throw new Error(`AudD request failed (${res.status})`);
  const data = await res.json();
  if (data.status !== "success") throw new Error(friendlyError(data.error?.error_message));
  return data.result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message?.type) {
        case "start-listening": {
          setBadgeListening();
          const tab = await getActiveTab();
          if (!tab?.id) throw new Error("No active tab to listen to.");
          if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:"))
            throw new Error("Cannot capture audio from browser internal pages.");
          const streamId = await new Promise<string>((resolve, reject) => {
            chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (id) => {
              if (chrome.runtime.lastError || !id) {
                reject(new Error(chrome.runtime.lastError?.message ?? "Could not capture tab audio."));
              } else {
                resolve(id);
              }
            });
          });
          await ensureOffscreenDocument();
          chrome.runtime.sendMessage({ type: "offscreen-capture", streamId });
          sendResponse({ ok: true });
          break;
        }
        case "stop-listening": {
          clearBadge();
          chrome.runtime.sendMessage({ type: "offscreen-stop" });
          sendResponse({ ok: true });
          break;
        }
        case "clip-captured": {
          clearBadge();
          let result: any;
          try {
            result = await recognize(message.dataUrl);
          } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            showErrorToast(error);
            chrome.runtime.sendMessage({ type: "recognition-error", error });
            sendResponse({ ok: false, error });
            return;
          }
          if (!result) {
            showErrorToast("No match found. Make sure audio is playing clearly.");
            chrome.runtime.sendMessage({ type: "recognition-result", result: null });
            sendResponse({ ok: true });
            return;
          }
          const key = cacheKey(result);
          if (key) {
            resultCache.set(key, { result, ts: Date.now() });
            for (const [k, v] of resultCache) {
              if (Date.now() - v.ts > CACHE_TTL) resultCache.delete(k);
            }
          }
          showResultToast(result);
          await saveResult(result);
          sendToBeacon(result);
          chrome.runtime.sendMessage({ type: "recognition-result", result });
          sendResponse({ ok: true });
          break;
        }
        case "clip-error": {
          clearBadge();
          showErrorToast(message.error ?? "Could not capture audio.");
          chrome.runtime.sendMessage({ type: "recognition-error", error: message.error });
          sendResponse({ ok: true });
          break;
        }
        case "open-sidepanel": {
          const tab = await getActiveTab();
          if (tab?.windowId) await chrome.sidePanel.open({ windowId: tab.windowId });
          sendResponse({ ok: true });
          break;
        }
        default:
          sendResponse({ ok: false, error: "Unknown message" });
      }
    } catch (err) {
      clearBadge();
      const error = err instanceof Error ? err.message : String(err);
      chrome.runtime.sendMessage({ type: "recognition-error", error });
      sendResponse({ ok: false, error });
    }
  })();
  return true;
});

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

const BEACON_URL = 'http://127.0.0.1:14921/track';

async function sendToBeacon(result: any) {
  const tab = await getActiveTab();
  const artUrl =
    result.apple_music?.artwork?.url?.replace('{w}x{h}', '512x512') ??
    result.spotify?.album?.images?.[0]?.url ??
    '';
  const payload = {
    title: result.title,
    artist: result.artist,
    artwork: artUrl,
    source: tab?.url ? new URL(tab.url).hostname : '',
    sourceHint: 'Tuneo',
    favicon: tab?.favIconUrl || '',
    pageUrl: tab?.url || '',
  };
  try {
    const res = await fetch(BEACON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) console.log('[tuneo] sent to Beacon');
  } catch {
    console.log('[tuneo] Beacon not available');
  }
}

function showErrorToast(message: string) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
    if (!tab?.id) return;
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (msg: string) => {
        const existing = document.getElementById("tuneo-toast");
        if (existing) existing.remove();
        const toast = document.createElement("div");
        toast.id = "tuneo-toast";
        toast.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483647;background:#d32f2f;color:#fff;padding:10px 16px;border-radius:12px;font-family:Inter,system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.2);opacity:0;transform:translateY(-12px);transition:opacity 0.25s ease,transform 0.25s ease;max-width:340px";
        toast.innerHTML = `<div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px">✗</span><div><div style="font-weight:600;font-size:13px">Recognition failed</div><div style="font-size:12px;opacity:0.9">${msg}</div></div></div>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
          toast.style.opacity = "1";
          toast.style.transform = "translateY(0)";
        });
        setTimeout(() => {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(-12px)";
          setTimeout(() => toast.remove(), 300);
        }, 5000);
      },
      args: [message]
    }).catch(() => {});
  });
}
function showResultToast(result: any) {
  const art = result.apple_music?.artwork?.url?.replace("{w}x{h}", "80x80") ?? result.spotify?.album?.images?.[0]?.url ?? "";
  const spotify = result.spotify?.external_urls?.spotify ?? "";
  const apple = result.apple_music?.url ?? "";
  const deezer = result.deezer?.link ?? "";
  const ytSearch = `https://music.youtube.com/search?q=${encodeURIComponent(result.title + " " + result.artist)}`;
  const ytMusicSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(result.title + " " + result.artist)}`;
  const scSearch = `https://soundcloud.com/search?q=${encodeURIComponent(result.title + " " + result.artist)}`;
  const album = result.album ?? "";
  const release = result.release_date ?? "";
  const label = result.label ?? "";
  chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
    if (!tab?.id) return;
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (t: string, a: string, artUrl: string, sp: string, ap: string, dz: string, yt: string, ytm: string, sc: string, alb: string, rel: string, lbl: string) => {
        const existing = document.getElementById("tuneo-toast");
        if (existing) existing.remove();
        const toast = document.createElement("div");
        toast.id = "tuneo-toast";
        const meta = [alb && `Album: ${alb}`, rel && `Released: ${rel}`, lbl && `Label: ${lbl}`].filter(Boolean).join(" · ");
        toast.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483647;background:#fff;color:#14141a;padding:0;border-radius:14px;font-family:Inter,system-ui,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,0.15);opacity:0;transform:translateY(-12px);transition:opacity 0.25s ease,transform 0.25s ease;max-width:360px;overflow:hidden;border:1px solid #ebe9f3;font-size:13px";
        toast.innerHTML = `<div style="display:flex;gap:10px;padding:10px;padding-bottom:6px">
          <img src="${artUrl}" onerror="this.style.display='none'" style="width:44px;height:44px;border-radius:10px;flex-shrink:0;background:#eeecff;object-fit:cover">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:13.5px;letter-spacing:-0.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t}</div>
            <div style="font-size:12px;color:#6c6c78;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a}</div>
            ${meta ? `<div style="font-size:11px;color:#9c9ca8;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${meta}</div>` : ""}
          </div>
        </div>
        <div style="display:flex;gap:4px;padding:4px 10px 10px;flex-wrap:wrap;border-top:1px solid #f0f0f5;padding-top:8px">
          ${sp ? `<a href="${sp}" target="_blank" style="display:inline-flex;align-items:center;gap:3px;color:#1DB954;text-decoration:none;font-weight:600;font-size:11px;border:1px solid #1DB95433;border-radius:9999px;padding:2px 8px;line-height:1.4" onmouseover="this.style.background='#1DB95415'" onmouseout="this.style.background='transparent'"><svg width="12" height="12" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 14.43c-.2.32-.6.42-.92.22-2.52-1.54-5.7-1.89-9.44-1.04-.36.08-.72-.14-.8-.5-.08-.36.14-.72.5-.8 4.04-.92 7.5-.52 10.28 1.18.32.2.42.6.22.94zm1.23-2.73c-.25.4-.78.52-1.18.27-2.89-1.77-7.29-2.28-10.71-1.25-.41.12-.84-.11-.96-.52-.12-.41.11-.84.52-.96 3.82-1.14 8.58-.58 11.8 1.42.4.25.52.78.27 1.18zm.11-2.85c-3.47-2.06-9.19-2.25-12.5-1.24-.5.15-1.03-.13-1.18-.63-.15-.5.13-1.03.63-1.18 3.82-1.15 10.14-.94 14.13 1.42.45.27.6.86.33 1.31-.27.45-.86.6-1.31.32z"/></svg>Spotify</a>` : `<a href="https://open.spotify.com/search/${encodeURIComponent(t + " " + a)}" target="_blank" style="display:inline-flex;align-items:center;gap:3px;color:#1DB954;text-decoration:none;font-weight:600;font-size:11px;border:1px solid #1DB95433;border-radius:9999px;padding:2px 8px;line-height:1.4" onmouseover="this.style.background='#1DB95415'" onmouseout="this.style.background='transparent'"><svg width="12" height="12" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 14.43c-.2.32-.6.42-.92.22-2.52-1.54-5.7-1.89-9.44-1.04-.36.08-.72-.14-.8-.5-.08-.36.14-.72.5-.8 4.04-.92 7.5-.52 10.28 1.18.32.2.42.6.22.94zm1.23-2.73c-.25.4-.78.52-1.18.27-2.89-1.77-7.29-2.28-10.71-1.25-.41.12-.84-.11-.96-.52-.12-.41.11-.84.52-.96 3.82-1.14 8.58-.58 11.8 1.42.4.25.52.78.27 1.18zm.11-2.85c-3.47-2.06-9.19-2.25-12.5-1.24-.5.15-1.03-.13-1.18-.63-.15-.5.13-1.03.63-1.18 3.82-1.15 10.14-.94 14.13 1.42.45.27.6.86.33 1.31-.27.45-.86.6-1.31.32z"/></svg>Spotify</a>`}
          ${ap ? `<a href="${ap}" target="_blank" style="display:inline-flex;align-items:center;gap:3px;color:#FA243C;text-decoration:none;font-weight:600;font-size:11px;border:1px solid #FA243C33;border-radius:9999px;padding:2px 8px;line-height:1.4" onmouseover="this.style.background='#FA243C15'" onmouseout="this.style.background='transparent'"><svg width="12" height="12" viewBox="0 0 24 24" fill="#FA243C"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5c0 .55-.45 1-1 1h-.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5H11v2zm5-1.5c0 .55-.45 1-1 1h-2.5V11h.5c.83 0 1.5.67 1.5 1.5V15zm0-5.5c0 .55-.45 1-1 1h-3.5V7h.5c.83 0 1.5.67 1.5 1.5V9.5z"/></svg>Apple Music</a>` : ""}
          ${dz ? `<a href="${dz}" target="_blank" style="display:inline-flex;align-items:center;gap:3px;color:#A238FF;text-decoration:none;font-weight:600;font-size:11px;border:1px solid #A238FF33;border-radius:9999px;padding:2px 8px;line-height:1.4" onmouseover="this.style.background='#A238FF15'" onmouseout="this.style.background='transparent'"><svg width="12" height="12" viewBox="0 0 24 24" fill="#A238FF"><path d="M3 4h2v2H3V4zm4 0h2v2H7V4zm4 0h2v2h-2V4zm4 0h2v2h-2V4zm4 0h2v2h-2V4zM3 8h2v2H3V8zm4 0h2v2H7V8zm4 0h2v2h-2V8zm4 0h2v2h-2V8zm4 0h2v2h-2V8zM3 12h2v2H3v-2zm4 0h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM3 16h2v2H3v-2zm4 0h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/></svg>Deezer</a>` : ""}
          <a href="${yt}" target="_blank" style="display:inline-flex;align-items:center;gap:3px;color:#FF0000;text-decoration:none;font-weight:600;font-size:11px;border:1px solid #FF000033;border-radius:9999px;padding:2px 8px;line-height:1.4" onmouseover="this.style.background='#FF000015'" onmouseout="this.style.background='transparent'"><svg width="12" height="12" viewBox="0 0 24 24" fill="#FF0000"><path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3-5.2 3z"/></svg>YouTube</a>
          <a href="${ytm}" target="_blank" style="display:inline-flex;align-items:center;gap:3px;color:#FF0000;text-decoration:none;font-weight:600;font-size:11px;border:1px solid #FF000033;border-radius:9999px;padding:2px 8px;line-height:1.4" onmouseover="this.style.background='#FF000015'" onmouseout="this.style.background='transparent'"><svg width="12" height="12" viewBox="0 0 24 24" fill="#FF0000"><circle cx="12" cy="12" r="10" fill="none" stroke="#FF0000" stroke-width="1.8"/><path d="M10 8l6 4-6 4V8z"/><circle cx="17" cy="7" r="3" fill="#FF0000" stroke="none"/></svg>YouTube Music</a>
          <a href="${sc}" target="_blank" style="display:inline-flex;align-items:center;gap:3px;color:#FF5500;text-decoration:none;font-weight:600;font-size:11px;border:1px solid #FF550033;border-radius:9999px;padding:2px 8px;line-height:1.4" onmouseover="this.style.background='#FF550015'" onmouseout="this.style.background='transparent'"><svg width="12" height="12" viewBox="0 0 24 24" fill="#FF5500"><path d="M17.5 10.5c-.28 0-.55.04-.81.1-.35-1.46-1.54-2.6-3.19-2.6-.42 0-.82.08-1.19.22-.1.04-.16.12-.16.22v6.56c0 .11.08.2.19.2h5.16c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5zM11 9.33c0-.11-.08-.2-.19-.2-.17 0-.33-.01-.5-.03-.1-.01-.19.06-.19.17v5.46c0 .11.08.2.19.2.17 0 .33.01.5.03.1.01.19-.06.19-.17V9.33zM8.5 9.8c0-.11-.08-.2-.19-.2-.17-.02-.34-.03-.52-.03-.18 0-.35.01-.52.03-.11.01-.19.1-.19.21v4.4c0 .11.08.2.19.2.17.02.34.03.52.03.18 0 .35-.01.52-.03.11-.01.19-.1.19-.2v-4.4zM6 10.7c0-.1-.08-.18-.18-.2-.16-.02-.33-.03-.5-.03-.17 0-.34.01-.5.03-.1.02-.18.1-.18.2v2.6c0 .1.08.18.18.2.16.02.33.03.5.03.17 0 .34-.01.5-.03.1-.02.18-.1.18-.2v-2.6z"/></svg>SoundCloud</a>
        </div>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
          toast.style.opacity = "1";
          toast.style.transform = "translateY(0)";
        });
        setTimeout(() => {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(-12px)";
          setTimeout(() => toast.remove(), 300);
        }, 8000);
      },
      args: [result.title, result.artist, art, spotify, apple, deezer, ytSearch, ytMusicSearch, scSearch, album, release, label]
    }).catch(() => {});
  });
}
