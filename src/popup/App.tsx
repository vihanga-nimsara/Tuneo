import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import OpenInNew from "@mui/icons-material/OpenInNew";
import ResultCard, { type Track } from "../sidepanel/ResultCard";
import Waveform from "../sidepanel/Waveform";

type Status = "idle" | "listening" | "matched" | "no-match" | "error";

export interface HistoryEntry {
  id: string;
  track: Track;
  matchedAt: number;
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
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

  const openSidepanel = () => {
    chrome.runtime.sendMessage({ type: "open-sidepanel" });
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 420, width: 360, py: 2, px: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 30, height: 30, borderRadius: "8px",
            background: "linear-gradient(135deg, #4b3aff, #7a6bff)",
            color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 16,
            boxShadow: "0 4px 10px rgba(75,58,255,0.28)",
          }}
        >
          ♪
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>
          Tuneo
        </Typography>
      </Stack>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mb: 2 }}>
        <Waveform
          active={status === "listening"}
          onStart={startListening}
          onStop={stopListening}
        />
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
        {history.slice(0, 3).map((entry) => (
          <ResultCard
            key={entry.id}
            track={entry.track}
            matchedAt={entry.matchedAt}
            expanded={false}
            isLatest={false}
            onToggle={() => {}}
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
  );
}
