# strudelussy API

Cloudflare Workers + Hono backend for the strudelussy MVP.

Upstream credit: this API layer builds on the forked [VoloBuilds/toaster](https://github.com/VoloBuilds/toaster) server structure and adapts it for the DAW/chat review flow.

## Implemented Endpoints

- `GET /` health check
- `POST /api/generate` legacy toaster generation route retained
- `POST /api/chat` streaming SSE chat endpoint for diff-aware code suggestions
- `GET /api/projects` list projects for `x-user-id`
- `POST /api/projects` create project
- `GET /api/projects/:id` load project
- `PUT /api/projects/:id` update project
- `DELETE /api/projects/:id` delete project
- `GET /api/projects/:id/versions` list snapshots
- `POST /api/projects/:id/versions` create snapshot
- `POST /api/share` create share link
- `GET /api/share/:id` load shared code

## Storage Model

Current MVP persistence is KV-backed:

- `SHARES_KV` for share links
- `PROJECTS_KV` for projects and versions

This is intentionally lighter than the full spec's planned Supabase model so the first end-to-end vertical slice can ship now.

## Setup

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm dev
```

## Required Configuration

`server/.dev.vars`:

```bash
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemini-2.5-flash
APP_URL=http://localhost:5173
```

`server/wrangler.toml` also needs KV bindings for:

- `SHARES_KV`
- `PROJECTS_KV`

For the maintainer-hosted live site, this file is intentionally host-local and not committed. The live clone uses `server/wrangler.toml.example` as the template and fills in local KV ids + vars before starting the worker.

## Verification

```bash
pnpm exec tsc --noEmit
```

## Notes

- Auth is currently header-based (`x-user-id`) to support guest mode and unblock MVP persistence.
- The chat route streams incremental chunks and then ends with the existing structured `AIResponse` payload.
- The chat route now degrades safely when the upstream model returns non-JSON text instead of the requested structured payload.
- The server currently uses `OPENROUTER_MODEL` or falls back to `google/gemini-2.5-flash`.
- The chat route allowlist currently only accepts `google/gemini-2.5-flash`, `google/gemini-3.1-flash-lite-preview`, and `google/gemini-3-flash-preview` from the UI.
- Only the last 20 non-system chat messages are forwarded to the LLM on each request.
- The sanitizer strips unsupported patterns like `.bend()`, `.stutter()`, `.bounce()`, `.pingpong()`, `.trancegate()`, `.rlpf()`, `.acidenv()`, removes stray `await`, replaces unsupported sound names like `chirp`, and rejects oversized generated code.
- Firebase auth and Supabase are still planned follow-up work from the full spec.
