/// <reference types="chrome" />

const AUDD_API_KEY = "ed467ff6226471122f61e1b665b01bc2";
const OFFSCREEN_URL = "src/offscreen/index.html";

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
          const result = await recognize(message.dataUrl);
          chrome.runtime.sendMessage({ type: "recognition-result", result });
          sendResponse({ ok: true });
          break;
        }
        case "clip-error": {
          clearBadge();
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
