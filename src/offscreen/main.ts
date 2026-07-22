/// <reference types="chrome" />

// Runs inside the hidden offscreen document. This is the only context in an
// MV3 extension allowed to hold a live tabCapture MediaStream.

const CLIP_SECONDS = 8;

let recorder: MediaRecorder | null = null;
let audioCtx: AudioContext | null = null;
let stream: MediaStream | null = null;

async function startCapture(streamId: string) {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      // @ts-expect-error - chrome-specific constraint
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId
      }
    },
    video: false
  });

  // Route audio back out to the tab's speakers so capturing doesn't mute it.
  audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  source.connect(audioCtx.destination);

  const chunks: BlobPart[] = [];
  recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.onstop = async () => {
    cleanup();
    if (chunks.length === 0) {
      chrome.runtime.sendMessage({ type: "clip-error", error: "No audio captured." });
      return;
    }
    const blob = new Blob(chunks, { type: "audio/webm" });
    const dataUrl = await blobToDataUrl(blob);
    chrome.runtime.sendMessage({ type: "clip-captured", dataUrl });
  };

  recorder.start();
  window.setTimeout(() => recorder?.stop(), CLIP_SECONDS * 1000);
}

function stopCapture() {
  recorder?.stop();
}

function cleanup() {
  stream?.getTracks().forEach((t) => t.stop());
  audioCtx?.close();
  recorder = null;
  stream = null;
  audioCtx = null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "offscreen-capture") {
    startCapture(message.streamId).catch((err) => {
      chrome.runtime.sendMessage({
        type: "clip-error",
        error: err instanceof Error ? err.message : String(err)
      });
    });
  }
  if (message?.type === "offscreen-stop") {
    stopCapture();
  }
});
