# strudelussy UI

Frontend for the strudelussy DAW MVP.

## What Is In This UI

- DAW-style project page at `/`
- projects gallery at `/projects`
- diff-aware AI chat review flow
- Strudel editor + playback using the existing upstream editor/runtime
- parsed BPM, key, section, and editable parameter metadata from current code
- guest-mode local project persistence
- version history refresh + restore panel

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

## Environment

Optional `ui/.env`:

```bash
VITE_API_URL=http://localhost:8787
```

## Important Files

- `src/pages/HomePage.tsx` - main DAW workspace
- `src/pages/ProjectsPage.tsx` - gallery page
- `src/stores/projectStore.ts` - Zustand project/session state
- `src/lib/api.ts` - API client
- `src/lib/codeParser.ts` - BPM/key/section/parameter parsing
- `src/components/StrudelEditor.tsx` - existing editor extended with line jumping and imperative evaluate hook
- `src/components/VersionHistoryPanel.tsx` - snapshot refresh/restore UI

## Notes

- Parameter sliders patch live code in-place and trigger a debounced re-evaluation while playback is active.
- The editor remains the upstream toaster Strudel editor; it was extended rather than replaced.
