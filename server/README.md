# strudelussy API

Cloudflare Workers + Hono backend for the strudelussy MVP.

## Implemented Endpoints

- `GET /` health check
- `POST /api/generate` legacy toaster generation route retained
- `POST /api/chat` structured AI chat endpoint for diff-aware code suggestions
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

## Verification

```bash
pnpm exec tsc --noEmit
```

## Notes

- Auth is currently header-based (`x-user-id`) to support guest mode and unblock MVP persistence.
- Firebase auth and Supabase are still planned follow-up work from the full spec.
