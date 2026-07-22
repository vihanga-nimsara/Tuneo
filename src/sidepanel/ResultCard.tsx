import { useState } from "react";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Collapse from "@mui/material/Collapse";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ContentCopy from "@mui/icons-material/ContentCopy";
import MusicNote from "@mui/icons-material/MusicNote";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import Label from "@mui/icons-material/Label";
import Link from "@mui/icons-material/Link";

export interface Track {
  title: string;
  artist: string;
  album?: string;
  release_date?: string;
  label?: string;
  song_link?: string;
  spotify?: { external_urls?: { spotify?: string }; album?: { images?: { url: string }[] } };
  apple_music?: { url?: string; artwork?: { url?: string } };
  deezer?: { link?: string };
}

function artworkFor(track: Track): string | null {
  const appleArt = track.apple_music?.artwork?.url?.replace("{w}x{h}", "300x300");
  return appleArt ?? track.spotify?.album?.images?.[0]?.url ?? null;
}

function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ResultCard({
  track,
  matchedAt,
  expanded,
  isLatest,
  onToggle
}: {
  track: Track;
  matchedAt: number;
  expanded: boolean;
  isLatest: boolean;
  onToggle: () => void;
}) {
  const [copiedToast, setCopiedToast] = useState(false);
  const art = artworkFor(track);

  const copyLink = async () => {
    const link = track.song_link ?? track.spotify?.external_urls?.spotify ?? "";
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiedToast(true);
  };

  return (
    <Card sx={{ mb: 1, ...(isLatest && { borderColor: "primary.light" }) }}>
      <Box
        component="button"
        onClick={onToggle}
        sx={{
          width: "100%", display: "flex", alignItems: "center", gap: 1.5, p: 1.5,
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
          font: "inherit", color: "inherit",
          "&:hover": { backgroundColor: "action.hover" },
        }}
      >
        <Avatar src={art ?? undefined} sx={{ width: 44, height: 44, borderRadius: "10px", bgcolor: "primary.light", color: "primary.main" }}>
          <MusicNote />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 600, fontSize: 13.5, letterSpacing: "-0.01em" }}>
            {track.title}
          </Typography>
          <Typography noWrap variant="body2" color="text.secondary">
            {track.artist}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "text.disabled", flexShrink: 0, pl: 1 }}>
          {timeAgo(matchedAt)}
        </Typography>
        <ExpandMore sx={{ fontSize: 18, color: "text.disabled", flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.18s ease" }} />
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ borderTop: "1px solid", borderColor: "divider", mx: 2, pt: 1.5, pb: 2 }}>
          {track.album && (
            <Row label="Album" icon={<MusicNote sx={{ fontSize: 15 }} />} value={track.album} />
          )}
          {track.release_date && (
            <Row label="Released" icon={<CalendarMonth sx={{ fontSize: 15 }} />} value={track.release_date} />
          )}
          {track.label && (
            <Row label="Label" icon={<Label sx={{ fontSize: 15 }} />} value={track.label} />
          )}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary", flexShrink: 0, minWidth: 54, pt: 0.3 }}>
              <Link sx={{ fontSize: 15 }} />
              <Typography variant="caption" color="text.secondary">Listen</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end", flex: 1 }}>
              {track.spotify?.external_urls?.spotify && (
                <Chip label="Spotify" component="a" href={track.spotify.external_urls.spotify} target="_blank" rel="noreferrer" clickable size="small" color="primary" variant="outlined" />
              )}
              {track.apple_music?.url && (
                <Chip label="Apple Music" component="a" href={track.apple_music.url} target="_blank" rel="noreferrer" clickable size="small" color="primary" variant="outlined" />
              )}
              {track.deezer?.link && (
                <Chip label="Deezer" component="a" href={track.deezer.link} target="_blank" rel="noreferrer" clickable size="small" color="primary" variant="outlined" />
              )}
              <Chip label="YouTube Music" component="a" href={`https://music.youtube.com/search?q=${encodeURIComponent(track.title + " " + track.artist)}`} target="_blank" rel="noreferrer" clickable size="small" color="primary" variant="outlined" />
              <Chip label="YouTube" component="a" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(track.title + " " + track.artist)}`} target="_blank" rel="noreferrer" clickable size="small" color="primary" variant="outlined" />
              <Chip label="SoundCloud" component="a" href={`https://soundcloud.com/search?q=${encodeURIComponent(track.title + " " + track.artist)}`} target="_blank" rel="noreferrer" clickable size="small" color="primary" variant="outlined" />
              <IconButton size="small" onClick={copyLink} sx={{ ml: 0.25 }} title="Copy link">
                <ContentCopy sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 1 }}>
            Matched {timeAgo(matchedAt)}
          </Typography>
        </Box>
      </Collapse>

      <Snackbar
        open={copiedToast}
        autoHideDuration={1500}
        onClose={() => setCopiedToast(false)}
        message="Link copied"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ "& .MuiSnackbarContent-root": { borderRadius: 9999, fontSize: 13, fontWeight: 600, py: 0.5 } }}
      />
    </Card>
  );
}

function Row({ label, icon, value }: { label: string; icon: React.ReactNode; value: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25, mb: 0.75 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary", flexShrink: 0 }}>
        {icon}
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 500, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </Typography>
    </Box>
  );
}
