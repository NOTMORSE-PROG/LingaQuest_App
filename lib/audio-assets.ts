/**
 * Maps remote audio URLs to bundled require() asset IDs.
 * After running scripts/download-audio.ts, this file will be regenerated
 * with actual require() calls pointing to bundled .mp3 files.
 *
 * For now, this is a stub that passes through remote URLs.
 * Once audio files are downloaded into assets/audio/, re-run the script
 * to generate the full asset map.
 */

/**
 * Resolve a remote audio URL to a bundled asset ID or pass-through.
 * Returns a number (require asset ID) for bundled files,
 * or { uri: string } for non-bundled URLs (online-only fallback).
 */
export function resolveAudioSource(remoteUrl: string): number | { uri: string } {
  // TODO: After running scripts/download-audio.ts, this file will be
  // regenerated with actual CHALLENGE_AUDIO and MUSIC_AUDIO maps.
  // For now, fall back to remote URLs.
  return { uri: remoteUrl };
}
