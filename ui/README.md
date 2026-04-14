# strudelussy UI

Frontend for the strudelussy DAW MVP.

Upstream credit: the editor/runtime foundation comes from [VoloBuilds/toaster](https://github.com/VoloBuilds/toaster), with strudelussy extending it through wrapper components and orchestration rather than replacing the core editor internals.

## What Is In This UI

- DAW-style three-column project page at `/`
- projects gallery at `/projects`
- diff-aware AI chat review flow
- streaming assistant responses with a live typing bubble
- Strudel editor + playback using the existing upstream editor/runtime
- parsed BPM, key, section, and per-track gain/pan metadata from current code
- guest-mode local project persistence
- version history refresh + restore panel
- preview/apply/reject AI patch flow with multiple pending diffs keyed per assistant message
- topbar actions for blank-project and demo-project bootstrapping, a master volume slider, and optional custom chat provider override
- rhythm generator with per-voice gain, arrange panel, FX rack with explicit on/off filter states, mutate toolbar, shortcut overlay, and BPM tap tempo
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

- `src/pages/HomePage.tsx` - DAW composition shell wiring chat, editor, HAL viz, transport, and side utilities
- `src/hooks/useChatOrchestrator.ts` - chat, preview, autosave, version, and editor orchestration
- `src/pages/ProjectsPage.tsx` - gallery page
- `src/stores/projectStore.ts` - Zustand project/session state
- `src/lib/api.ts` - API client
- `src/lib/codeParser.ts` - BPM/key/section/track parsing plus FX, arrange, and mutation helpers
- `src/components/StrudelEditor.tsx` - existing editor extended with line jumping and imperative evaluate hook
- `src/components/VersionHistoryPanel.tsx` - snapshot refresh/restore UI
- `src/components/ProjectTopbar.tsx` - project metadata, BPM tap tempo, master volume, custom provider config, export/share, shortcuts, and template actions
- `src/components/TransportBar.tsx` - transport controls, visualization, and section navigation
- `src/components/EditorPanel.tsx` - Strudel editor wrapper, section strip, and mutate toolbar
- `src/components/DawPanel.tsx` - right-side DAW utilities for telemetry, mixer, rhythm, arrange, and FX
- `src/components/HalVisualization.tsx` - center-column HAL visualization panel
- `src/components/RhythmGenerator.tsx` - Euclidean drum pattern helper with per-voice gain control
- `src/components/ArrangePanel.tsx` - per-track mask scheduling helper with a fixed 16-step grid
- `src/components/FxRack.tsx` - global track FX application helper with explicit filter enable/disable toggles
- `src/components/ShortcutsOverlay.tsx` - keyboard shortcut reference modal

## Notes

- Track mixer sliders patch per-track `gain()` and `pan()` calls live in the code and trigger a debounced re-evaluation while playback is active.
- Slider commits create version snapshots on pointer/key release when the code actually changed.
- AI previews can audition a proposed patch in the editor before Apply; Reject or Stop Preview restores the pre-preview snapshot.
- The shell uses a fixed three-column layout: chat on the left, editor plus HAL visualization in the center, and DAW utilities on the right.
- The right-side DAW panel scrolls internally so Rhythm Generator, Arrange, FX Rack, and Track Mixer remain reachable without document scrolling.
- The editor remains the upstream toaster Strudel editor; it was extended rather than replaced.
- `pnpm preview` is only the local Vite production preview, not the production hosting path.
- Public `strudel.ussyco.de` hosting should use a production build, not the Vite dev server.
- The DAW shell is intentionally designed around panel-local scrolling rather than document-level page scrolling.
- Chat requests default to `google/gemini-2.5-flash`, but users can provide a custom endpoint + API key override in the topbar.
- When a custom provider is configured, the model selector is populated from that provider's `/models` API.
- The streaming chat client keeps the pending assistant message visible on stream failures and malformed SSE chunks instead of losing the patch preview.
- The topbar master volume slider controls a shared gain stage in the Strudel audio output, so it affects live playback immediately without rewriting code.
