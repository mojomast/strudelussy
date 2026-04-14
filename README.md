# strudelussy

`strudelussy` is a DAW-style fork of Toaster for building Strudel projects with an AI copilot.

This repo now includes a working MVP built on top of the upstream toaster codebase:

- DAW-style single-project workspace
- diff-aware AI chat flow with Apply/Reject review
- live Strudel editor and playback using the existing `StrudelEditor.tsx`
- parsed BPM, key, sections, and editable parameter controls from live code
- guest-mode local persistence plus server-side KV-backed project persistence
- projects gallery route, share/export basics, and version restore UI
- explicit `New Project` and `Load Demo` flows
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
- Strudel editor panel
- visualization/transport strip
- section strip parsed from `// [section]` comments
- editable parameter panel that patches numeric literals in-place
- version history panel with refresh and restore
- topbar actions for starting a blank project or reloading the demo template
- viewport-first responsive layout with earlier panel stacking and internal scrolling
- lightweight project state is handled with Zustand
- guest-mode projects are stored in `localStorage`
- `/projects` lists locally stored projects and attempts remote project listing when available

### Backend

- `POST /api/chat` returns structured AI responses for the diff-review flow
- chat parsing is hardened so non-JSON model responses degrade into normal assistant messages instead of 500s
- `GET/POST/PUT/DELETE /api/projects` provide KV-backed project persistence
- `GET/POST /api/projects/:id/versions` provide lightweight snapshot history
- existing `/api/share` remains available for share links

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
