import { useState } from "react";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ContentCopy from "@mui/icons-material/ContentCopy";
import MusicNote from "@mui/icons-material/MusicNote";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import Label from "@mui/icons-material/Label";
import Link from "@mui/icons-material/Link";
import { SpotifyIcon, AppleMusicIcon, DeezerIcon, YouTubeIcon, YouTubeMusicIcon, SoundCloudIcon, PLATFORMS } from "./PlatformIcons";

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
  onToggle,
  compact
}: {
  track: Track;
  matchedAt: number;
  expanded: boolean;
  isLatest: boolean;
  onToggle: () => void;
  compact?: boolean;
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
    <Card sx={{ mb: compact ? 0.5 : 1, ...(isLatest && { borderColor: "primary.light" }) }}>
      <Box
        component="button"
        onClick={onToggle}
        sx={{
          width: "100%", display: "flex", alignItems: "center", gap: compact ? 1 : 1.5, p: compact ? 1 : 1.5,
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
          font: "inherit", color: "inherit",
          "&:hover": { backgroundColor: "action.hover" },
        }}
      >
        <Avatar src={art ?? undefined} sx={{ width: compact ? 28 : 44, height: compact ? 28 : 44, borderRadius: compact ? "6px" : "10px", bgcolor: "primary.light", color: "primary.main" }}>
          <MusicNote />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 600, fontSize: compact ? 12.5 : 13.5, letterSpacing: "-0.01em" }}>
            {compact ? `${track.title} — ${track.artist}` : track.title}
          </Typography>
          {!compact && (
            <Typography noWrap variant="body2" color="text.secondary">
              {track.artist}
            </Typography>
          )}
        </Box>
        {!compact && (
          <Typography variant="caption" sx={{ color: "text.disabled", flexShrink: 0, pl: 1 }}>
            {timeAgo(matchedAt)}
          </Typography>
        )}
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
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end", flex: 1, alignItems: "center" }}>
              <PlatformLink
                href={track.spotify?.external_urls?.spotify ?? `https://open.spotify.com/search/${encodeURIComponent(track.title + " " + track.artist)}`}
                icon={<SpotifyIcon sx={{ fontSize: 15 }} />} label="Spotify" color={PLATFORMS.spotify.color} hover={PLATFORMS.spotify.hover}
              />
              {track.apple_music?.url && (
                <PlatformLink href={track.apple_music.url} icon={<AppleMusicIcon sx={{ fontSize: 15 }} />} label="Apple Music" color={PLATFORMS.apple_music.color} hover={PLATFORMS.apple_music.hover} />
              )}
              {track.deezer?.link && (
                <PlatformLink href={track.deezer.link} icon={<DeezerIcon sx={{ fontSize: 15 }} />} label="Deezer" color={PLATFORMS.deezer.color} hover={PLATFORMS.deezer.hover} />
              )}
              <PlatformLink href={`https://music.youtube.com/search?q=${encodeURIComponent(track.title + " " + track.artist)}`} icon={<YouTubeMusicIcon sx={{ fontSize: 15 }} />} label="YouTube Music" color={PLATFORMS.youtube_music.color} hover={PLATFORMS.youtube_music.hover} />
              <PlatformLink href={`https://www.youtube.com/results?search_query=${encodeURIComponent(track.title + " " + track.artist)}`} icon={<YouTubeIcon sx={{ fontSize: 15 }} />} label="YouTube" color={PLATFORMS.youtube.color} hover={PLATFORMS.youtube.hover} />
              <PlatformLink href={`https://soundcloud.com/search?q=${encodeURIComponent(track.title + " " + track.artist)}`} icon={<SoundCloudIcon sx={{ fontSize: 15 }} />} label="SoundCloud" color={PLATFORMS.soundcloud.color} hover={PLATFORMS.soundcloud.hover} />
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

function PlatformLink({ href, icon, label, color, hover }: { href: string; icon: React.ReactNode; label: string; color: string; hover: string }) {
  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noreferrer"
      sx={{
        display: "inline-flex", alignItems: "center", gap: 0.5,
        color, textDecoration: "none", fontWeight: 600, fontSize: 12,
        border: "1px solid", borderColor: `${color}33`,
        borderRadius: 9999, px: 1, py: 0.4, lineHeight: 1.4,
        transition: "background 0.15s ease, border-color 0.15s ease",
        "&:hover": { backgroundColor: `${hover}15`, borderColor: `${hover}55` },
      }}
    >
      {icon}
      {label}
    </Box>
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
