---
phase: 23-web-pack-downloading
plan: 05
status: complete
completed: "2026-06-18"
commit: f0fa8e9
---

# Plan 23-05 Summary: packs/index.tsx Web Offline Download UI

## What was done

Modified `apps/mobile/app/packs/index.tsx` with five targeted changes:

1. **Destructured** `offlinePackIds`, `downloadPackForOffline`, `refreshOfflinePackIds` from `usePackStore()`
2. **Added useEffect** to call `refreshOfflinePackIds()` on mount (web only, `Platform.OS === 'web'` guard)
3. **Added `handleDownloadForOffline`** handler that calls `downloadPackForOffline(pack)` with error logging
4. **Updated FlatList renderItem** to show per-pack web offline UI:
   - `isOfflineOnWeb`: `Platform.OS === 'web' && offlinePackIds.includes(item.id)`
   - Shows `"Downloaded"` italic badge when `isOfflineOnWeb`
   - Shows `"Download for offline"` underlined link when not offline; `disabled` while `isDownloading`
   - Native download flow (`handleDownload`, `handlePackPress`) unchanged
5. **Updated DownloadProgress** visibility: `(selectedPack || Platform.OS === 'web')` so it shows during web offline downloads without a selectedPack
6. **Added styles**: `webOfflineRow`, `downloadButton`, `downloadButtonText`, `downloadedBadge`

## Files changed

- `apps/mobile/app/packs/index.tsx` — 77 insertions, 15 deletions

## Test results

400/400 tests passing after this commit.
