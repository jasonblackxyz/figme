# Backlog

Ideas and deferred work items for FigMe.

## Auto-save / State Persistence

Browser reloads (from Vite restarts, accidental navigation, etc.) wipe all in-memory state. Add persistence so designs survive reloads:
- localStorage auto-save already exists (`src/features/file-io/autoSave.ts`) but only runs every 30s
- Consider auto-restore on app startup from the last auto-save
- Consider shorter auto-save intervals or save-on-change
- IndexedDB for larger documents that exceed localStorage limits
