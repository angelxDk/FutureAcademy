export function parseSpotifyLink(value) {
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || url.port || url.username || url.password) return null;
    const match = url.pathname.match(/^\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(playlist|album|track)\/([a-zA-Z0-9]{22})\/?$/);
    return match ? { mediaType: match[1], spotifyUri: match[2] } : null;
  } catch {
    return null;
  }
}
