# LinguaQuest monorepo

This branch keeps the Expo application at `/` and imports the latest committed
tree of the Next.js API under `backend/` as a clean synchronization snapshot.
The original backend repository remains the authoritative history and rollback
source.

- Canonical GitHub URL: https://github.com/NOTMORSE-PROG/LingaQuest_App
- Backend history and rollback source:
  https://github.com/NOTMORSE-PROG/LingaQuest_Web

The audit did not find a connected Vercel project for this pair. Any existing
external deployment must keep its current project and public URL, with
`backend/` configured as the root directory only when the source repository
is intentionally switched.
