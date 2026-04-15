# strudelussy

`strudelussy` is a DAW-style fork of Toaster for building Strudel projects with an AI copilot.

Upstream credit: this repo extends [VoloBuilds/toaster](https://github.com/VoloBuilds/toaster), and keeps large parts of the original editor/runtime workflow intact while layering DAW-oriented orchestration on top.

This repo now includes a working MVP built on top of the upstream toaster codebase:

- DAW-style three-column single-project workspace
- diff-aware AI chat flow with Apply/Reject review
- streaming AI chat flow with live assistant typing, preview/apply/reject review, and per-message pending diffs
- live Strudel editor and playback using the existing `StrudelEditor.tsx`
- parsed BPM, key, sections, and a per-track gain/pan mixer from live code
- guest-mode local persistence plus server-side KV-backed project persistence
- projects gallery route, share/export basics, and version restore UI
- explicit `New Project` and `Load Demo` flows
- rhythm generator with per-voice gain, arrange mask, FX rack with explicit on/off filter states, mutate toolbar, keyboard shortcuts overlay, BPM/key utilities in the right-side DAW column, a topbar master volume slider, and optional custom chat provider override
- public host runtime for `strudel.ussyco.de`

The full long-form spec remains in `docs/SPEC_TOASTER_DAW.md`. This implementation intentionally focuses on the first coherent vertical slice rather than the entire spec at once.

## Repository Structure

- `ui/` React + Vite frontend
- `server/` Cloudflare Workers + Hono API
- `docs/` specs and implementation notes

## Implemented MVP

### Frontend

- `HomePage` is now a DAW shell with:
- project topbar
- AI chat panel
- diff preview cards
- center editor column with HAL layered beneath the code inside the editor surface
- transport/version strip below the editor surface
- always-visible right-side DAW utility panel
- section strip parsed from `// [section]` comments
- per-track mixer panel that edits `gain()` and `pan()` live in the code
- rhythm generator with per-voice gain, arrange mask, FX rack with explicit on/off filter states, mutate toolbar, keyboard shortcuts overlay, BPM tap tempo, a topbar master volume slider, and optional custom chat provider override
- version history panel with refresh and restore
- topbar actions are now arranged as a compact horizontal toolbar: project identity on the left, prompt/model/audio controls in the middle, action buttons on the right, with a slim secondary row for smaller utility controls when needed
- the topbar includes a `Viz On` / `Viz Off` toggle for the HAL background under the editor
- viewport-first responsive layout with earlier panel stacking and internal scrolling, including a scrollable editor column so lower DAW panels stay reachable
- lightweight project state is handled with Zustand
- guest-mode projects are stored in `localStorage`
- `/projects` lists locally stored projects and attempts remote project listing when available

### Backend

- `POST /api/chat` streams SSE chunks, then finishes with the existing structured `AIResponse` shape
- chat parsing is hardened so non-JSON model responses degrade into normal assistant messages instead of 500s
- chat SSE parsing is hardened so malformed chunks and delayed `[DONE]` boundaries do not drop pending AI patches
- transient empty/truncated chat responses are automatically retried once before surfacing an error to the user
- chat requests default to `google/gemini-2.5-flash`, but users can override the endpoint and API key in the topbar
- the topbar can switch between a legacy toaster-style system prompt and a stricter Strudelussy prompt
- users can also append their own custom system prompt instructions from the topbar
- users can load baseline or improved prompt text into the editable prompt field and save local prompt presets for testing
- custom-provider model lists are loaded dynamically from `/models` after the user clicks `Load Models`, so the picker reflects the connected API without firing early requests
- the Strudelussy prompt uses an always-4-fields JSON contract, a closed-world Strudel rule set, and an explicit decision ladder for unsupported requests
- the improved prompt also steers “occasional” events toward explicit `~`-based pattern choices instead of misusing `sometimesBy()`
- the HAL visualization now receives the live Strudel `AnalyserNode`, so motion is audio-reactive again instead of purely decorative
- invalid drum bank+voice combinations are remapped to verified sample combos before code reaches the editor
- chat history sent to the LLM is capped to the last 20 non-system messages
- oversized generated code is rejected with a structured assistant message instead of reaching the editor
- unsupported generated methods like `.bend()`, `.stutter()`, `.bounce()`, `.pingpong()`, `.trancegate()`, `.rlpf()`, and `.acidenv()` are stripped before code reaches the editor
- `GET/POST/PUT/DELETE /api/projects` provide KV-backed project persistence
- `GET/POST /api/projects/:id/versions` provide lightweight snapshot history
- existing `/api/share` remains available for share links
- share creation now feeds clearer UI feedback and clipboard copy on the frontend instead of surfacing a raw sentinel string

## Still Deferred From The Full Spec

- Firebase auth and Supabase-backed persistence
- public read-only share route backed by project visibility
- multi-panel resizing
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
