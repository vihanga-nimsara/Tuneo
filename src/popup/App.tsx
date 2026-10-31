import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import OpenInNew from "@mui/icons-material/OpenInNew";
import PushPin from "@mui/icons-material/PushPin";
import ViewCompact from "@mui/icons-material/ViewCompact";
import ViewStream from "@mui/icons-material/ViewStream";
import IconButton from "@mui/material/IconButton";
import ResultCard, { type Track } from "../sidepanel/ResultCard";
import Waveform from "../sidepanel/Waveform";

type Status = "idle" | "listening" | "matched" | "no-match" | "error";

export interface HistoryEntry {
  id: string;
  track: Track;
  matchedAt: number;
}

function artworkUrl(track: Track): string {
  const appleArt = track.apple_music?.artwork?.url?.replace("{w}x{h}", "300x300");
  return appleArt ?? track.spotify?.album?.images?.[0]?.url ?? "";
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [compact, setCompact] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    chrome.storage.local.get(["compactCards"]).then((res) => {
      if (res.compactCards) setCompact(true);
    });
    chrome.identity.getProfileUserInfo().then((info) => {
      const name = info.email?.split("@")[0] ?? "";
      setUserName(name ? `Hi, ${name}` : "");
    }).catch(() => {});

    chrome.storage.local.get(["history"]).then((res) => {
      if (Array.isArray(res.history)) setHistory(res.history);
    });

    const listener = (message: any) => {
      if (message?.type === "recognition-result") {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        if (message.result) {
          const entry: HistoryEntry = {
            id: crypto.randomUUID(),
            track: message.result,
            matchedAt: Date.now()
          };
          setStatus("matched");
          setExpandedId(entry.id);
          setHistory((prev) => {
            const next = [entry, ...prev].slice(0, 25);
            chrome.storage.local.set({ history: next });
            return next;
          });
          setTimeout(() => setStatus("idle"), 5000);
        } else {
          setStatus("no-match");
          setTimeout(() => setStatus("idle"), 3000);
        }
      }
      if (message?.type === "recognition-error") {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        setErrorMsg(message.error ?? "Something went wrong.");
        setStatus("error");
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const startListening = () => {
    setStatus("listening");
    chrome.runtime.sendMessage({ type: "start-listening" });
    timeoutRef.current = window.setTimeout(() => {
      setErrorMsg("Listening timed out. Try again.");
      setStatus("error");
    }, 15000);
  };

  const stopListening = () => {
    chrome.runtime.sendMessage({ type: "stop-listening" });
    setStatus("idle");
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  };

  const openSidepanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  };

  let statusText: string;
  let statusSx = {};
  switch (status) {
    case "listening":
      statusText = "Listening...";
      break;
    case "matched":
      statusText = "Song identified!";
      break;
    case "no-match":
      statusText = "No match found";
      statusSx = { color: "text.disabled" };
      break;
    case "error":
      statusText = errorMsg;
      statusSx = { color: "error.main" };
      break;
    default:
      statusText = "Tap to identify music";
  }

  const bgUrl = history.length > 0 ? artworkUrl(history[0].track) : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", maxHeight: 600, width: 360, py: 2, px: 2, position: "relative", overflow: "hidden" }}>
      {bgUrl && (
        <>
          <Box
            sx={{
              position: "absolute", inset: 0, zIndex: 0,
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "blur(40px)", opacity: 0.08,
            }}
          />
          <Box
            sx={{
              position: "absolute", inset: 0, zIndex: 0,
              background: "linear-gradient(to bottom, rgba(246,245,251,0.92) 0%, transparent 30%, transparent 65%, rgba(246,245,251,0.96) 100%)",
            }}
          />
        </>
      )}
      <Box sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", maxHeight: 600, overflowY: "auto" }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography component="span" sx={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em", lineHeight: 1, userSelect: "none" }}>
          Tuneo
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {userName && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {userName}
            </Typography>
          )}
          <IconButton size="small" onClick={() => {
            const next = !compact;
            setCompact(next);
            chrome.storage.local.set({ compactCards: next });
          }} title={compact ? "Normal view" : "Compact view"}>
            {compact ? <ViewStream sx={{ fontSize: 16, color: "text.disabled" }} /> : <ViewCompact sx={{ fontSize: 16, color: "text.disabled" }} />}
          </IconButton>
          <IconButton size="small" onClick={openSidepanel} title="Pin popup (open side panel)">
            <PushPin sx={{ fontSize: 16, color: "text.disabled" }} />
          </IconButton>
        </Stack>
      </Stack>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mb: 2 }}>
        {status === "listening" ? (
          <Box component="button" onClick={stopListening} sx={{ background: "none", border: "none", cursor: "pointer", p: 0, lineHeight: 0 }}>
            <img src="/source.gif" alt="Listening..." style={{ width: 100, height: 100, borderRadius: "50%" }} />
          </Box>
        ) : (
          <Waveform active={status === "listening"} onStart={startListening} onStop={stopListening} />
        )}
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", ...statusSx }}>
          {statusText}
        </Typography>
      </Box>

      <Box sx={{ flex: 1 }}>
        {history.length > 0 && (
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: "block", mb: 0.75, px: 0.5 }}>
            Recent matches
          </Typography>
        )}
        {history.length === 0 && (
          <Box sx={{ textAlign: "center", py: 3, color: "text.disabled" }}>
            <Typography variant="body2">No matches yet</Typography>
            <Typography variant="caption">Play audio in this tab, then tap the button above.</Typography>
          </Box>
        )}
        {history.slice(0, compact ? 25 : 10).map((entry, i) => (
          <ResultCard
            key={entry.id}
            track={entry.track}
            matchedAt={entry.matchedAt}
            expanded={expandedId === entry.id}
            isLatest={i === 0}
            onToggle={() => setExpandedId((cur) => (cur === entry.id ? null : entry.id))}
            compact={compact}
          />
        ))}
      </Box>

      {history.length > 0 && (
        <Button
          variant="text"
          fullWidth
          endIcon={<OpenInNew sx={{ fontSize: 16 }} />}
          onClick={openSidepanel}
          sx={{ mt: 1, py: 1, fontSize: 13 }}
        >
          See all matches
        </Button>
      )}
    </Box>
    </Box>
  );
}
