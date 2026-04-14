# strudelussy UI

Frontend for the strudelussy DAW MVP.

Upstream credit: the editor/runtime foundation comes from [VoloBuilds/toaster](https://github.com/VoloBuilds/toaster), with strudelussy extending it through wrapper components and orchestration rather than replacing the core editor internals.

## What Is In This UI

- DAW-style project page at `/`
- projects gallery at `/projects`
- diff-aware AI chat review flow
- streaming assistant responses with a live typing bubble
- Strudel editor + playback using the existing upstream editor/runtime
- parsed BPM, key, section, and editable parameter metadata from current code
- guest-mode local project persistence
- version history refresh + restore panel
- preview/apply/reject AI patch flow with multiple pending diffs keyed per assistant message
- model selector for supported OpenRouter chat models
- topbar actions for blank-project and demo-project bootstrapping
- viewport-first responsive shell that keeps the main workspace visible without browser zoom on typical laptop/tablet sizes

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
VITE_API_URL=http://localhost:8788
```

## Important Files

- `src/pages/HomePage.tsx` - DAW composition shell
- `src/hooks/useChatOrchestrator.ts` - chat, preview, autosave, version, and editor orchestration
- `src/pages/ProjectsPage.tsx` - gallery page
- `src/stores/projectStore.ts` - Zustand project/session state
- `src/lib/api.ts` - API client
- `src/lib/codeParser.ts` - BPM/key/section/parameter parsing
- `src/components/StrudelEditor.tsx` - existing editor extended with line jumping and imperative evaluate hook
- `src/components/VersionHistoryPanel.tsx` - snapshot refresh/restore UI
- `src/components/ProjectTopbar.tsx` - project metadata, model selector, export/share, and template actions
- `src/components/TransportBar.tsx` - transport controls, visualization, and section navigation
- `src/components/EditorPanel.tsx` - Strudel editor wrapper, telemetry, section strip, and param controls

## Notes

- Parameter sliders patch live code in-place and trigger a debounced re-evaluation while playback is active.
- Slider commits create version snapshots on pointer/key release when the code actually changed.
- AI previews can audition a proposed patch in the editor before Apply; Reject or Stop Preview restores the pre-preview snapshot.
- The editor remains the upstream toaster Strudel editor; it was extended rather than replaced.
- `pnpm preview` is only the local Vite production preview, not the production hosting path.
- Public `strudel.ussyco.de` hosting should use a production build, not the Vite dev server.
- The DAW shell is intentionally designed around panel-local scrolling rather than document-level page scrolling.
