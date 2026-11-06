import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpotifyLink } from '../src/utils/spotify.js';

test('accepts shared and localized Spotify links', () => {
  for (const type of ['playlist', 'album', 'track']) {
    assert.deepEqual(parseSpotifyLink(`https://open.spotify.com/intl-pt/${type}/37i9dQZF1DX9uKNf5jGX6m?si=share`), {
      mediaType: type, spotifyUri: '37i9dQZF1DX9uKNf5jGX6m'
    });
  }
});

test('rejects unrelated hosts, malformed identifiers and unsupported links', () => {
  for (const value of ['https://evil.test/open.spotify.com/playlist/37i9dQZF1DX9uKNf5jGX6m', 'https://open.spotify.com.evil.test/playlist/37i9dQZF1DX9uKNf5jGX6m', 'https://open.spotify.com/playlist/short', 'http://open.spotify.com/playlist/37i9dQZF1DX9uKNf5jGX6m', 'https://open.spotify.com/artist/37i9dQZF1DX9uKNf5jGX6m', '']) {
    assert.equal(parseSpotifyLink(value), null);
  }
});
