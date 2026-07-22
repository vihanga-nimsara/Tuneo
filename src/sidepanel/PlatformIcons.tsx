import SvgIcon from "@mui/material/SvgIcon";

export function SpotifyIcon(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 14.43c-.2.32-.6.42-.92.22-2.52-1.54-5.7-1.89-9.44-1.04-.36.08-.72-.14-.8-.5-.08-.36.14-.72.5-.8 4.04-.92 7.5-.52 10.28 1.18.32.2.42.6.22.94zm1.23-2.73c-.25.4-.78.52-1.18.27-2.89-1.77-7.29-2.28-10.71-1.25-.41.12-.84-.11-.96-.52-.12-.41.11-.84.52-.96 3.82-1.14 8.58-.58 11.8 1.42.4.25.52.78.27 1.18zm.11-2.85c-3.47-2.06-9.19-2.25-12.5-1.24-.5.15-1.03-.13-1.18-.63-.15-.5.13-1.03.63-1.18 3.82-1.15 10.14-.94 14.13 1.42.45.27.6.86.33 1.31-.27.45-.86.6-1.31.32z" />
    </SvgIcon>
  );
}

export function AppleMusicIcon(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5c0 .55-.45 1-1 1h-.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5H11v2zm5-1.5c0 .55-.45 1-1 1h-2.5V11h.5c.83 0 1.5.67 1.5 1.5V15zm0-5.5c0 .55-.45 1-1 1h-3.5V7h.5c.83 0 1.5.67 1.5 1.5V9.5z" />
    </SvgIcon>
  );
}

export function DeezerIcon(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M3 4h2v2H3V4zm4 0h2v2H7V4zm4 0h2v2h-2V4zm4 0h2v2h-2V4zm4 0h2v2h-2V4zM3 8h2v2H3V8zm4 0h2v2H7V8zm4 0h2v2h-2V8zm4 0h2v2h-2V8zm4 0h2v2h-2V8zM3 12h2v2H3v-2zm4 0h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM3 16h2v2H3v-2zm4 0h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z" />
    </SvgIcon>
  );
}

export function YouTubeIcon(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3-5.2 3z" />
    </SvgIcon>
  );
}

export function YouTubeMusicIcon(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 8l6 4-6 4V8z" />
      <circle cx="17" cy="7" r="3" fill="currentColor" stroke="none" />
    </SvgIcon>
  );
}

export function SoundCloudIcon(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M17.5 10.5c-.28 0-.55.04-.81.1-.35-1.46-1.54-2.6-3.19-2.6-.42 0-.82.08-1.19.22-.1.04-.16.12-.16.22v6.56c0 .11.08.2.19.2h5.16c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5zM11 9.33c0-.11-.08-.2-.19-.2-.17 0-.33-.01-.5-.03-.1-.01-.19.06-.19.17v5.46c0 .11.08.2.19.2.17 0 .33.01.5.03.1.01.19-.06.19-.17V9.33zM8.5 9.8c0-.11-.08-.2-.19-.2-.17-.02-.34-.03-.52-.03-.18 0-.35.01-.52.03-.11.01-.19.1-.19.21v4.4c0 .11.08.2.19.2.17.02.34.03.52.03.18 0 .35-.01.52-.03.11-.01.19-.1.19-.2v-4.4zM6 10.7c0-.1-.08-.18-.18-.2-.16-.02-.33-.03-.5-.03-.17 0-.34.01-.5.03-.1.02-.18.1-.18.2v2.6c0 .1.08.18.18.2.16.02.33.03.5.03.17 0 .34-.01.5-.03.1-.02.18-.1.18-.2v-2.6z" />
    </SvgIcon>
  );
}

export const PLATFORMS = {
  spotify: { color: "#1DB954", hover: "#1aa34a" },
  apple_music: { color: "#FA243C", hover: "#d91e33" },
  deezer: { color: "#A238FF", hover: "#8c2edb" },
  youtube_music: { color: "#FF0000", hover: "#d60000" },
  youtube: { color: "#FF0000", hover: "#d60000" },
  soundcloud: { color: "#FF5500", hover: "#d94800" },
} as const;
