# strudelussy

`strudelussy` is a DAW-style fork of Toaster for building Strudel projects with an AI copilot.

Upstream credit: this repo extends [VoloBuilds/toaster](https://github.com/VoloBuilds/toaster), and keeps large parts of the original editor/runtime workflow intact while layering DAW-oriented orchestration on top.

This repo now includes a working MVP built on top of the upstream toaster codebase:

- DAW-style three-column workspace with resizable, collapsible panels and CSS Grid layout
- two UI modes: **Ussy mode** (new refactored layout) and **Legacy mode** (original layout preserved), toggled with `Cmd+Shift+L`
- Ussy design system with `--ussy-*` CSS custom properties (electric teal accent, surface palette, motion contract)
- diff-aware AI chat flow with Apply/Reject review
- streaming AI chat flow with live assistant typing, preview/apply/reject review, and per-message pending diffs
- live Strudel editor and playback using the existing `StrudelEditor.tsx`
- inline Strudel-aware autocomplete in the editor with Ctrl/Cmd+Space trigger, Tab accept, function signatures, method suggestions, live variables, parsed track names, hover docs, and tutorial lesson references
- tutorial lessons can auto-load their scaffold into the editor, show live validation feedback while you type, and visually gate later chapters until earlier progress thresholds are met
- parsed BPM, key, sections, and a per-track gain/pan mixer from live code
- guest-mode local persistence plus server-side KV-backed project persistence
- projects gallery route, share/export basics, and version restore UI
- explicit `New Project` and `Load Demo` flows
- rhythm generator with per-voice gain, arrange mask, FX rack with explicit on/off filter states, mutate toolbar, keyboard shortcuts overlay, and optional custom chat provider override
- collapsible accordion sections in the DAW sidebar with localStorage-persisted open/close state and ResizeObserver-based animated expand/collapse
- slim single-row topbar with settings drawer (4 tabs: AI Settings, Prompts, API, Export & Share), editable BPM and Key inputs, Escape-to-close, and active tab badge on gear button
- focus mode (`Cmd+Shift+F`) that hides topbar and both sidebars for distraction-free editing
- panel toggle shortcuts (`[` for chat, `]` for DAW) with proper CodeMirror contenteditable guard
- slim 44px transport bar with phase progress indicator and expanding ring pulse animation
- lazy-loaded HAL visualization with code-split chunk, rendered both as editor overlay and as a separate viz panel in the center column
- resize handles use pointer events with `setPointerCapture` for tablet/trackpad support
- panel widths and collapse states persisted to localStorage (widths debounced 300ms, collapse states immediate)
- chat panel collapse button integrated into the ChatPanel header via `React.cloneElement` injection
- version history rendered inside DawPanel accordion (not as a separate panel in DAWShell sidebar)
- token usage pill with `≈` prefix format and red pulse warning animation at high usage
- mixer slider value popover: floating tooltip above thumb during drag
- `prefers-reduced-motion` respected globally (motion durations, pulse animations)
- public host runtime for `strudel.ussyco.de`

The full long-form spec remains in `docs/SPEC_TOASTER_DAW.md`. This implementation intentionally focuses on the first coherent vertical slice rather than the entire spec at once.

## Repository Structure

- `ui/` React + Vite frontend
- `server/` Cloudflare Workers + Hono API
- `docs/` specs and implementation notes

## MCP

The server now includes a native MCP endpoint at `/mcp` for external MCP-capable agents.

- implementation guide: `docs/MCP.md`
- original design spec: `docs/SPEC_MCP.md`

Highlights:

- Streamable HTTP transport via Hono
- bearer-token protection via `MCP_SECRET`
- pattern editing, transport, project, and resource tools
- server-native KV-backed behavior with no browser automation

## Implemented MVP

### Frontend

- `HomePage` supports two UI modes:
  - **Ussy mode** (`DAWShell.tsx`): CSS Grid layout with `--chat-width`/`--daw-width` CSS variables, pointer-event resize handles on both sidebars, collapse-to-icon-rail, focus mode, and the ussy design system
  - **Legacy mode** (`LegacyDAWShell.tsx`): preserved copy of the original fixed three-column layout
  - Toggle between modes with `Cmd+Shift+L` or a floating button
- project topbar: slim 40px single-row bar with settings drawer (4 tabs), editable BPM/Key inputs, token usage pill with `≈` prefix and red pulse warning, `Cmd+,` to open / Escape to close
- AI chat panel (collapsible via `[` key or header chevron button), with message count badge and session clear action
- diff preview cards
- center editor column with lazy-loaded HAL layered beneath the code inside the editor surface, plus a separate viz panel slot rendered via `<Suspense>`
- editor autocomplete for core Strudel factories, time transforms, pitch helpers, effects, drum labels, and chainable methods
- slim 44px transport bar with phase progress indicator and expanding ring pulse animation
- collapsible right-side DAW utility panel (via `]` key or chevron button) with accordion sections:
  - Mixer (per-track gain/pan with floating value popover on drag)
  - Rhythm Generator (Euclidean drum patterns)
  - Arrange (per-track 16-step mask grid, badge with section count)
  - FX Rack (room, delay, filters, gain with on/off toggles, badge with FX count)
  - Version History (real VersionHistoryPanel, badge with snapshot count)
- accordion section state persisted in localStorage, with Collapse All / Expand All toggle
- accordion animation driven by ResizeObserver with dynamic duration proportional to content height
- section strip parsed from `// [section]` comments
- keyboard shortcuts overlay grouped into 4 sections (Playback & Editing, Chat, UI Panels, Settings)
- focus mode (`Cmd+Shift+F`) hides topbar and both sidebars, floating toggle always visible
- version history panel with refresh and restore, rendered inside DawPanel accordion
- topbar actions organized as a compact horizontal toolbar with settings drawer for secondary controls
- gear button shows active tab name badge when drawer is open
- the topbar includes a `Viz On` / `Viz Off` toggle for the HAL background under the editor
- resize handles on both chat and DAW panels with min/max constraints, using pointer events with `setPointerCapture` for tablet/trackpad support
- panel widths and collapse states persisted to localStorage (widths debounced 300ms)
- full ARIA accessibility: tablist/tab/tabpanel roles in settings drawer, aria-labels on icon-only buttons, role=progressbar on phase bar, aria-expanded on accordion headers
- `prefers-reduced-motion` respected: all motion durations and pulse animations disabled
- lightweight project state is handled with Zustand
- guest-mode projects are stored in `localStorage`
- `/projects` lists locally stored projects and attempts remote project listing when available

### Backend

- `POST /api/chat` streams SSE chunks, then finishes with the existing structured `AIResponse` shape
- chat parsing now enforces a strict 4-field JSON contract: `message`, `code`, `diff_summary`, `has_code_change`
- chat parsing is hardened so non-JSON, malformed JSON, and schema-mismatched model responses degrade into safe assistant messages instead of 500s
- chat SSE parsing is hardened so malformed chunks, keepalive comments, CRLF frames, and delayed `[DONE]` boundaries do not drop pending AI patches
- transient empty/truncated chat responses are automatically retried once before surfacing an error to the user
- chat requests default to `google/gemini-2.5-flash`, but users can override the endpoint and API key in the topbar
- the topbar can switch between a legacy toaster-style system prompt and a stricter Strudelussy prompt
- users can also append their own custom system prompt instructions from the topbar
- users can load baseline or improved prompt text into the editable prompt field and save local prompt presets for testing
- custom-provider model lists are loaded dynamically from `/models` after the user clicks `Load Models`, so the picker reflects the connected API without firing early requests
- the Strudelussy prompt uses an always-4-fields JSON contract, a closed-world Strudel rule set, and an explicit decision ladder for unsupported requests
- the improved prompt also steers “occasional” events toward explicit `~`-based pattern choices instead of misusing `sometimesBy()`
- invalid rare-event sample patterns like `s("").sometimesBy(0.1, x => s("token"))` and no-op `.sometimesBy(..., x => x)` output are now auto-repaired into safe explicit `~`-based mini-notation before reaching the editor
- older chat history is summarized while only recent turns are sent verbatim, keeping the LLM context healthier in long sessions
- the UI shows an approximate token-count indicator so heavy contexts are visible before quality degrades
- the HAL visualization now receives the live Strudel `AnalyserNode`, so motion is audio-reactive again instead of purely decorative
- invalid drum bank+voice combinations are remapped to verified sample combos before code reaches the editor, while unsupported banks and unsupported methods fail closed
- chat history sent to the LLM is capped to the last 20 non-system messages
- oversized generated code is rejected with a structured assistant message instead of reaching the editor
- unsupported generated methods like `.bend()`, `.stutter()`, `.bounce()`, `.pingpong()`, `.trancegate()`, `.rlpf()`, and `.acidenv()` are rejected before code reaches the editor
- `POST /api/generate` now validates returned raw Strudel code, unwraps accidental JSON/fences, rejects unchanged “fixes”, and uses the configured default model instead of a deprecated hardcoded preview model
- `GET/POST/PUT/DELETE /api/projects` provide KV-backed project persistence
- `GET/POST /api/projects/:id/versions` provide lightweight snapshot history
- existing `/api/share` remains available for share links
- share creation now feeds clearer UI feedback and clipboard copy on the frontend instead of surfacing a raw sentinel string
- the chat panel now shows explicit stream/connect/review/error states, and the live proxy preserves SSE streaming instead of buffering the full response

## Still Deferred From The Full Spec

- Firebase auth and Supabase-backed persistence
- public read-only share route backed by project visibility
- minimap and inline editor diff rendering
- authenticated multi-user gallery/workflows

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Cloudflare account if you want to deploy the API

### Install

```bash
git clone https://github.com/mojomast/strudelussy.git
cd strudelussy
pnpm install --dir ui
pnpm install --dir server
```

### Local Development

Backend:

```bash
cd server
cp .dev.vars.example .dev.vars
pnpm dev
```

Frontend:

```bash
cd ui
pnpm dev
```

Open `http://localhost:5173`.

Public runtime on the maintainer machine currently uses:

- `https://strudel.ussyco.de` for the app
- a local path-aware proxy that serves the built SPA and forwards `/api/*` to the worker on `:8788`
- the public proxy now streams `text/event-stream` responses through directly so `/api/chat` works on the live host without buffering the full reply first
- a dedicated deploy clone at `/home/mojo/projects/strudelussy-live` plus `scripts/live_sync.sh` to fast-forward `origin/main`, rebuild `ui/dist`, and restart the local proxy/worker

## Environment

Frontend `ui/.env`:

```bash
VITE_API_URL=http://localhost:8788
```

Backend `server/.dev.vars`:

```bash
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemini-2.5-flash
APP_URL=http://localhost:5173
MCP_SECRET=local-dev-secret
```

For persistent projects in the worker, also configure `PROJECTS_KV` and `SHARES_KV` in `server/wrangler.toml`.

## Verification

Frontend build:

```bash
cd ui
pnpm build
```

Server typecheck:

```bash
cd server
pnpm exec tsc --noEmit
```

## Docs

- `docs/SPEC_TOASTER_DAW.md` - source spec
- `docs/MCP.md` - current MCP implementation guide
- `docs/SPEC_MCP.md` - MCP design/spec document
- `docs/STRUDEL_SOURCE_DISCLOSURE.md` - AGPL/source disclosure for the live site and embedded Strudel prompt docs
- `server/src/lib/strudel-docs/` - checked-in Strudel reference sections used by the chat system prompt

## Source And License Notice

The public `strudel.ussyco.de` deployment is served from this repository's `main` branch via `scripts/live_sync.sh`.

- Corresponding source: `https://github.com/mojomast/strudelussy`
- License: `LICENSE`
- Embedded Strudel prompt reference: `server/src/lib/strudel-docs/`

The `10-full-song-examples.ts` file exists in the repo as a disabled placeholder and is not currently included in the combined `STRUDEL_DOCS` prompt bundle.
