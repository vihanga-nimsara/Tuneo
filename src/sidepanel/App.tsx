import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Search from "@mui/icons-material/Search";
import FileDownload from "@mui/icons-material/FileDownload";
import ContentCopy from "@mui/icons-material/ContentCopy";
import Delete from "@mui/icons-material/Delete";
import ResultCard, { type Track } from "./ResultCard";
import Waveform from "./Waveform";

type Status = "idle" | "listening" | "matched" | "no-match" | "error";

export interface HistoryEntry {
  id: string;
  track: Track;
  matchedAt: number;
}

function filterEntries(entries: HistoryEntry[], query: string): HistoryEntry[] {
  if (!query.trim()) return entries;
  const q = query.toLowerCase();
  return entries.filter(
    (e) =>
      e.track.title.toLowerCase().includes(q) ||
      e.track.artist.toLowerCase().includes(q) ||
      (e.track.album ?? "").toLowerCase().includes(q)
  );
}

function toCsv(entries: HistoryEntry[]): string {
  const header = "Title,Artist,Album,Label,Released,Matched,Spotify,Apple Music,Deezer,Song Link";
  const rows = entries.map((e) => {
    const t = e.track;
    return [
      csvEscape(t.title),
      csvEscape(t.artist),
      csvEscape(t.album ?? ""),
      csvEscape(t.label ?? ""),
      csvEscape(t.release_date ?? ""),
      new Date(e.matchedAt).toISOString(),
      csvEscape(t.spotify?.external_urls?.spotify ?? ""),
      csvEscape(t.apple_music?.url ?? ""),
      csvEscape(t.deezer?.link ?? ""),
      csvEscape(t.song_link ?? "")
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function toTextList(entries: HistoryEntry[]): string {
  return entries.map((e) => `${e.track.artist} - ${e.track.title}`).join("\n");
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [copiedText, setCopiedText] = useState(false);
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

  const clearHistory = () => {
    setHistory([]);
    setSearch("");
    chrome.storage.local.set({ history: [] });
  };

  const exportCsv = () => {
    download(toCsv(history), `tuneo-history-${Date.now()}.csv`, "text/csv");
  };

  const copyTextList = async () => {
    await navigator.clipboard.writeText(toTextList(history));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const filtered = filterEntries(history, search);

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
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Box sx={{ display: "flex", justifyContent: "center", py: 2.5, px: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 34, height: 34, borderRadius: "10px",
              background: "linear-gradient(135deg, #4b3aff, #7a6bff)",
              color: "#fff", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 18,
              boxShadow: "0 4px 10px rgba(75,58,255,0.28)",
            }}
          >
            ♪
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>
            Tuneo
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 5, px: 2, gap: 3 }}>
        <Waveform
          active={status === "listening"}
          onStart={startListening}
          onStop={stopListening}
        />
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", ...statusSx }}>
          {statusText}
        </Typography>
      </Box>

      <Box sx={{ px: 2, pb: 2.5 }}>
        {history.length > 0 && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                Matches
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <Button size="small" startIcon={<ContentCopy sx={{ fontSize: 14 }} />} onClick={copyTextList}>
                  {copiedText ? "Copied!" : "Copy"}
                </Button>
                <Button size="small" startIcon={<FileDownload sx={{ fontSize: 14 }} />} onClick={exportCsv}>
                  CSV
                </Button>
                <Button size="small" startIcon={<Delete sx={{ fontSize: 14 }} />} color="error" onClick={clearHistory}>
                  Clear
                </Button>
              </Stack>
            </Box>
            {history.length > 2 && (
              <TextField
                size="small"
                placeholder="Search matches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
                sx={{ mb: 1.5 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 18, color: "text.disabled" }} />
                      </InputAdornment>
                    ),
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <Box
                          component="button"
                          onClick={() => setSearch("")}
                          sx={{ background: "none", border: "none", color: "text.disabled", cursor: "pointer", fontSize: 16, p: 0, lineHeight: 1 }}
                        >
                          ×
                        </Box>
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
              />
            )}
          </>
        )}
        {history.length === 0 && (
          <Box sx={{ textAlign: "center", py: 4, color: "text.disabled" }}>
            <Typography variant="body2">No matches yet</Typography>
            <Typography variant="caption">Play audio in this tab, then tap the button above.</Typography>
          </Box>
        )}
        {filtered.length === 0 && history.length > 0 && (
          <Box sx={{ textAlign: "center", py: 4, color: "text.disabled" }}>
            <Typography variant="body2">No matches match your search</Typography>
          </Box>
        )}
        {filtered.map((entry, i) => (
          <ResultCard
            key={entry.id}
            track={entry.track}
            matchedAt={entry.matchedAt}
            expanded={expandedId === entry.id}
            isLatest={history[0]?.id === entry.id}
            onToggle={() => setExpandedId((cur) => (cur === entry.id ? null : entry.id))}
          />
        ))}
      </Box>
    </Box>
  );
}
