import { useEffect, useState } from "react";
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
import ViewCompact from "@mui/icons-material/ViewCompact";
import ViewStream from "@mui/icons-material/ViewStream";
import IconButton from "@mui/material/IconButton";
import ResultCard, { type Track } from "./ResultCard";

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

function artworkUrl(track: Track): string {
  const appleArt = track.apple_music?.artwork?.url?.replace("{w}x{h}", "300x300");
  return appleArt ?? track.spotify?.album?.images?.[0]?.url ?? "";
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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [copiedText, setCopiedText] = useState(false);
  const [userName, setUserName] = useState("");
  const [compact, setCompact] = useState(false);

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
        if (message.result) {
          const entry: HistoryEntry = {
            id: crypto.randomUUID(),
            track: message.result,
            matchedAt: Date.now()
          };
          setHistory((prev) => {
            const next = [entry, ...prev].slice(0, 25);
            chrome.storage.local.set({ history: next });
            return next;
          });
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

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

  const bgUrl = history.length > 0 ? artworkUrl(history[0].track) : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", position: "relative" }}>
      {bgUrl && (
        <>
          <Box
            sx={{
              position: "fixed", inset: 0, zIndex: 0,
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "blur(40px)", opacity: 0.08,
            }}
          />
          <Box
            sx={{
              position: "fixed", inset: 0, zIndex: 0,
              background: "linear-gradient(to bottom, rgba(246,245,251,0.92) 0%, transparent 30%, transparent 65%, rgba(246,245,251,0.96) 100%)",
            }}
          />
        </>
      )}
      <Box sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 2.5, px: 2 }}>
        <img src="/tuneo.png" alt="Tuneo" draggable={false} onContextMenu={(e) => e.preventDefault()} style={{ height: 22, userSelect: "none" }} />
        {userName && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {userName}
            </Typography>
            <IconButton size="small" onClick={() => {
              const next = !compact;
              setCompact(next);
              chrome.storage.local.set({ compactCards: next });
            }} title={compact ? "Normal view" : "Compact view"}>
              {compact ? <ViewStream sx={{ fontSize: 16, color: "text.disabled" }} /> : <ViewCompact sx={{ fontSize: 16, color: "text.disabled" }} />}
            </IconButton>
          </Stack>
        )}
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
            <Typography variant="caption">Identify a song from the popup to see it here.</Typography>
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
            compact={compact}
          />
        ))}
      </Box>
    </Box>
    </Box>
  );
}
