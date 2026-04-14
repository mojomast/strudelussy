# SPEC: strudelussy — AI-Powered Music DAW Dashboard
> **Project:** `strudelussy`
> **Fork of:** [VoloBuilds/toaster](https://github.com/VoloBuilds/toaster)
> **Author:** Kyle Durepos / The Ussyverse
> **Status:** In progress — MVP vertical slice implemented
> **Stack:** React 18 + TypeScript + Vite + Tailwind + ShadCN + Strudel + Cloudflare Workers + Hono + Supabase + Firebase Auth

---

## Implementation Status

Current repo status after the first build pass:

- Imported the upstream toaster `ui/` and `server/` codebase into this repo as the implementation base
- Reworked the frontend into a DAW-style project page with:
- project topbar
- diff-aware chat panel
- section strip from `// [section]` comments
- transport/visualization status area
- projects gallery route
- editable parameter sliders backed by live code patching
- rhythm generator, arrange mask panel, FX rack, mutate toolbar, keyboard shortcut overlay, and BPM tap tempo
- version history refresh and restore UI
- explicit blank-project and demo-project loading actions
- viewport-first responsive layout tuning so the dashboard stacks earlier and fits common screens without browser zoom
- Added Zustand project state, code parsing utilities, guest-mode local persistence, and export/share basics
- Added worker routes for structured `POST /api/chat` and KV-backed `projects` + `versions` persistence
- Hardened AI chat parsing so malformed/non-JSON model responses fail soft instead of crashing the endpoint
- Added streaming chat responses over SSE, preview-before-apply diff auditioning, multi-pending diff tracking keyed by message id, and stricter unsupported-pattern sanitizing

Items still intentionally deferred from the full spec:

- Supabase data model and Firebase auth integration
- resizable multi-panel layout
- public read-only project share route
- editor minimap and inline diff highlighting

This means the spec is no longer "ready for agent implementation" in the abstract: the MVP is underway and the repo contains a working first vertical slice.

---

## 1. Vision

`strudelussy` is a supercharged fork of Toaster that transforms a simple AI-music chat interface into a **full-blown DAW-style dashboard** where:

- A user chats with an AI bot that writes, updates, and edits **Strudel code** in real time
- The user has **full human-in-the-loop control** — they can override, tweak, undo, and re-prompt at any time
- Songs are saved, loaded, versioned, and exported
- The interface feels like a **semi-DAW**: track metadata, BPM/key display, pattern labeling, parameter sliders, and a code editor all live together in a rich split-panel layout
- Everything is powered by Strudel under the hood — no new audio engine, just better tooling around it

---

## 2. Core Features

### 2.1 AI Chat Interface (Enhanced)
- **Persistent conversation thread** per song project — the bot remembers context across messages
- Chat messages tagged as `user` | `assistant` | `system` with timestamps
- Bot responses include **diff-aware code patches** — it shows what changed, not just a full code dump
- User can **accept, reject, or partially apply** a bot suggestion before it goes live in the editor
- Bot understands current code state at all times (current editor code is injected into system context on every message)
- Support for **natural language song instructions**: "add a breakbeat at bar 3", "make the bass heavier", "switch to a minor key", "add reverb to the hi-hats"
- Chat history is persisted per project. Current implementation stores the full history for display/persistence but only sends the most recent 20 non-system messages to the LLM.

### 2.2 Strudel Code Editor (Enhanced)
- Existing `StrudelEditor.tsx` is preserved and extended — **do not replace it**
- Add a **split view** toggle: side-by-side (chat left, editor right) or stacked
- Code editor gains a **minimap** (CodeMirror extension)
- **Diff highlighting**: when AI proposes a change, show green/red diff inline before apply
- Manual edits in the editor are **auto-synced back to AI context** — bot always knows what the current code looks like
- Add **named regions/sections** support via comments (`// [verse]`, `// [chorus]`) that the UI recognizes and surfaces as labeled blocks

### 2.3 Project Management (Save / Load / Export)
Each "project" is a named music session. Projects are stored in **Supabase**.

**Project data model:**
```ts
interface Project {
  id: string                  // UUID
  user_id: string             // Firebase UID
  name: string                // "My Banger #3"
  description?: string
  strudel_code: string        // Current live code
  chat_history: ChatMessage[] // Full conversation
  versions: CodeVersion[]     // Snapshot history
  bpm?: number                // Parsed or manually set
  key?: string                // e.g. "C minor"
  tags: string[]
  created_at: string
  updated_at: string
}

interface CodeVersion {
  id: string
  code: string
  label?: string              // e.g. "Before chorus drop"
  created_at: string
  created_by: 'user' | 'ai'
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  code_diff?: CodeDiff        // Optional diff if AI changed code
  timestamp: string
}

interface CodeDiff {
  before: string
  after: string
  summary: string             // Human-readable: "Added bd pattern, modified hh"
}
```

**Features:**
- **Auto-save**: debounced save every 3 seconds when code or chat changes
- **Manual save**: Cmd/Ctrl+S creates a named version snapshot
- **Version history panel**: visual timeline of code snapshots, click to restore
- **Export options:**
  - `.strudel` file (JSON with code + metadata)
  - `.txt` raw Strudel code
  - Share link (public URL that loads project in read-only mode)
  - Future: WAV/MP3 export via OfflineAudioContext (stretch goal, flag as TODO)

### 2.4 DAW-Style Dashboard Layout

The main layout is a **responsive multi-panel dashboard**. Default layout (desktop):

```
┌──────────────────────────────────────────────────────────────────┐
│  TOPBAR: Logo | Project Name (editable) | BPM | Key | Play/Stop  │
│           Save | Export | Version dropdown | Auth avatar          │
├────────────────┬─────────────────────────────────────────────────┤
│                │                                                  │
│   CHAT PANEL   │           EDITOR PANEL                          │
│   (left 35%)   │           (right 65%)                           │
│                │   [ Strudel Code Editor - full height ]         │
│  Conversation  │                                                  │
│  thread with   │                                                  │
│  diff previews │                                                  │
│                │                                                  │
├────────────────┴─────────────────────────────────────────────────┤
│  BOTTOM BAR: Waveform Visualizer | Transport Controls | Status   │
│              Section Labels | Undo/Redo | Error Display          │
└──────────────────────────────────────────────────────────────────┘
```

**Panels are resizable** via drag handles (use `react-resizable-panels` or CSS flex with drag).

**Mobile layout**: stacked — Topbar → Transport → Editor → Chat (collapsible).

### 2.5 Transport Bar (Enhanced)
The existing play/stop controls are moved into a proper transport bar:

- Play / Pause / Stop buttons with keyboard shortcuts (Space = play/stop)
- **BPM display** — read from Strudel CPS (`cps * 60 * 4`), also manually editable, writes `setcps()` into code
- **Key / Scale display** — AI-detected from code (e.g., if it sees `.scale("C:minor")`) or manually tagged
- **Cycle indicator** — visual progress bar showing current cycle phase (uses existing `getCycleInfo()`)
- **Undo / Redo** buttons (already exposed by `StrudelEditor.tsx`, wire into topbar)
- **Error badge** — shows red dot + message if Strudel error, clears on next successful eval

### 2.6 Section Labels / Track Regions
Users and AI can annotate sections of the Strudel code with labels:

- Sections defined by comments: `// [verse]`, `// [chorus]`, `// [drop]`
- UI parses these and renders a **horizontal section strip** in the bottom bar showing labeled regions
- Clicking a section label **jumps the cursor** to that section in the editor
- AI can be told "add a bridge section" and it will add the comment + code block

### 2.7 Parameter Panel (Sidebar / Popover)
A collapsible panel that exposes **tweakable parameters** extracted from the live Strudel code:

- Parser scans code for numeric literals in key positions (`.speed(0.5)`, `.gain(0.8)`, `setcps(0.6)`)
- Each detected parameter renders as a **labeled slider** with min/max heuristics
- Changing slider value **live-patches** the code (replaces the numeric literal in-place)
- AI can be asked "expose the gain as a parameter" and it annotates the code with `// @param gain 0-1`
- Params marked with `// @param` are always shown in the panel regardless of parse confidence

### 2.8 Visualization (Enhanced HAL)
Existing `HalVisualization.tsx` is retained. Enhancements:

- Add a **waveform/spectrum bar** in the bottom transport area (small, 60px tall strip)
- Visualization responds to `isPlaying` state — fades to idle when stopped
- User can choose visualization theme: `hal` (existing) | `spectrum` | `waveform` | `minimal`
- Visualization settings saved per project

### 2.9 Authentication & User Management
Using existing plan (Firebase Auth + Supabase data):

- Sign in with Google / GitHub (Firebase)
- On first load, unauthenticated users get a **guest mode** with localStorage-only projects (no server sync)
- Auth modal on save attempt prompts login with "save your work"
- User profile dropdown: avatar, name, logout, link to "My Projects" page

### 2.10 Projects Gallery Page
Route: `/projects`

- Grid of project cards: name, last updated, BPM, key, tag pills
- Search + filter by tag
- Click to open project in DAW view
- "New Project" button → creates blank project and navigates to DAW
- Delete with confirmation

---

## 3. AI Bot Behavior & System Prompt

### 3.1 System Context Injected Per Message
Every chat API call to the LLM includes:

```
You are a music production AI assistant working inside a Strudel live coding environment.

Current Strudel code:
\`\`\`strudel
{CURRENT_CODE}
\`\`\`

Project metadata:
- BPM: {BPM}
- Key: {KEY}
- Tags: {TAGS}

Your job is to help the user create and modify music using Strudel's mini-notation and pattern API.
When modifying code, ALWAYS return:
1. The complete updated Strudel code (full replacement, valid and runnable)
2. A short human-readable summary of what changed (max 2 sentences)
3. A JSON diff object with keys: before (original), after (new), summary

Never truncate or omit code. Never use placeholder comments like "// rest of code here".
Prefer incremental changes. Ask clarifying questions if the request is ambiguous.

Strudel reference cheat sheet:
[include abbreviated Strudel API reference here — see Section 7]
```

### 3.2 Response Format (Structured Output)
The LLM is prompted to respond in JSON. Current implementation parses JSON when present, but deliberately falls back to a plain assistant message when a provider returns non-JSON text instead of failing the request:

```ts
interface AIResponse {
  message: string        // Conversational message to user
  code?: string          // New full code if changed (omit if no code change)
  diff_summary?: string  // "Added bd pattern to bar 1, adjusted hh gain"
  has_code_change: boolean
}
```

### 3.3 Diff Preview Flow
1. User sends message
2. Bot responds with `AIResponse`
3. If `has_code_change === true`:
    - Show **diff preview card** in chat thread (green additions, red removals)
    - Three review actions: **Preview** | **✅ Apply** | **❌ Reject**
    - Preview → loads the proposed code into the editor, can auto-start playback, and can be stopped/restored before committing
    - Apply → pushes code to editor + saves a version snapshot
    - Reject → code unchanged, conversation continues
4. User can **edit applied code manually** at any time — no lock-in

---

## 4. New API Routes (Server — Cloudflare Workers / Hono)

Extend existing server with:

### `POST /api/chat`
Body:
```ts
{
  project_id?: string
  messages: { role: string, content: string }[]
  current_code: string
  project_meta: { bpm?: number, key?: string, tags?: string[] }
}
```
Response: streamed SSE chunks during generation, followed by the existing `AIResponse` shape at stream completion.

### `GET /api/projects` (authenticated)
Returns list of user's projects.

### `POST /api/projects` (authenticated)
Creates new project.

### `PUT /api/projects/:id` (authenticated)
Updates project (code, chat history, metadata).

### `DELETE /api/projects/:id` (authenticated)
Deletes project with confirmation.

### `GET /api/projects/:id/versions`
Returns version history for a project.

### `POST /api/projects/:id/versions`
Creates a manual version snapshot.

### `GET /api/share/:id`
Returns public read-only project data (only if project has `is_public: true`).

---

## 5. New UI Components

### `ChatPanel.tsx`
- Scrollable message thread
- Message input with send button + Shift+Enter multiline
- Diff preview card component (`DiffPreviewCard.tsx`)
- AI typing indicator (animated dots)
- "Bot is thinking..." skeleton

### `DiffPreviewCard.tsx`
- Shows before/after code diff using `react-diff-viewer-continued` or similar
- Apply / Reject buttons
- Collapsible diff view (summary shown by default, full diff on expand)

### `ProjectTopbar.tsx`
- Inline-editable project name (click to edit)
- BPM display (editable input)
- Key display (editable select: chromatic notes + scale)
- Transport controls (Play/Stop/Pause)
- Save button with "saved" checkmark feedback
- Export dropdown
- Version history dropdown (last 10 snapshots)

### `ParameterPanel.tsx`
- Collapsible slide-out panel from right edge
- Slider components per detected/annotated param
- Live code patching on slider drag

### `SectionStrip.tsx`
- Horizontal bar in bottom transport area
- Colored blocks per labeled section
- Click to navigate editor cursor

### `ProjectsPage.tsx`
- `/projects` route
- Project card grid with search/filter

### `VersionHistoryPanel.tsx`
- Timeline list of `CodeVersion` entries
- Click to preview in read-only editor overlay
- "Restore" button to apply

### `ExportMenu.tsx`
- Dropdown with export options
- `.strudel` JSON download
- `.txt` raw code download
- Copy share link to clipboard

---

## 6. State Management

Use **Zustand** for global client state (already a natural fit given existing functional-style codebase):

```ts
// stores/projectStore.ts
interface ProjectStore {
  currentProject: Project | null
  isDirty: boolean
  isSaving: boolean
  chatMessages: ChatMessage[]
  pendingDiff: CodeDiff | null   // AI proposed change awaiting accept/reject
  activeSection: string | null
  params: ExtractedParam[]
  actions: {
    setCode: (code: string) => void
    sendChatMessage: (content: string) => Promise<void>
    applyDiff: () => void
    rejectDiff: () => void
    saveVersion: (label?: string) => Promise<void>
    loadProject: (id: string) => Promise<void>
    exportProject: (format: 'strudel' | 'txt') => void
  }
}
```

---

## 7. Strudel API Reference (Injected into System Prompt)

Include a condensed cheat sheet in the system prompt covering:
- Mini-notation: `bd sd hh`, `[bd sd]*2`, `<a b c>`, `~` (rest), `!` (repeat)
- Core: `sound()`, `note()`, `s()`, `n()`, `.gain()`, `.pan()`, `.speed()`, `.room()`, `.delay()`
- Pattern: `.stack()`, `.cat()`, `.slow()`, `.fast()`, `.every()`, `.sometimes()`, `.jux()`
- Tonal: `.scale()`, `.transpose()`, `.chord()`
- Timing: `setcps()`, `.cpm()`, `.bpm()`
- Effects: `.reverb()`, `.distort()`, `.lpf()`, `.hpf()`, `.crush()`

---

## 8. File Structure (New/Modified Files)

```
strudelussy/
├── ui/
│   ├── src/
│   │   ├── components/
│   │   │   ├── StrudelEditor.tsx         ← EXISTING, extend only
│   │   │   ├── HalVisualization.tsx      ← EXISTING, extend only
│   │   │   ├── ChatPanel.tsx             ← NEW
│   │   │   ├── DiffPreviewCard.tsx       ← NEW
│   │   │   ├── ProjectTopbar.tsx         ← NEW (replaces old header)
│   │   │   ├── ParameterPanel.tsx        ← NEW
│   │   │   ├── SectionStrip.tsx          ← NEW
│   │   │   ├── VersionHistoryPanel.tsx   ← NEW
│   │   │   ├── ExportMenu.tsx            ← NEW
│   │   │   ├── VisualizationBar.tsx      ← NEW (mini waveform strip)
│   │   │   └── ui/                       ← EXISTING ShadCN components
│   │   ├── pages/
│   │   │   ├── HomePage.tsx              ← MODIFIED (becomes DAW view)
│   │   │   ├── ProjectsPage.tsx          ← NEW
│   │   │   └── SharePage.tsx             ← NEW (read-only share view)
│   │   ├── stores/
│   │   │   ├── projectStore.ts           ← NEW (Zustand)
│   │   │   └── uiStore.ts                ← NEW (panel layout state)
│   │   ├── lib/
│   │   │   ├── api.ts                    ← EXISTING, extend with new routes
│   │   │   ├── supabase.ts               ← NEW (Supabase client)
│   │   │   ├── firebase.ts               ← NEW (Firebase auth)
│   │   │   ├── codeParser.ts             ← NEW (extract BPM/params/sections)
│   │   │   └── diffUtils.ts              ← NEW (code diff helpers)
│   │   └── types/
│   │       ├── project.ts                ← NEW (Project, CodeVersion, etc.)
│   │       └── chat.ts                   ← NEW (ChatMessage, AIResponse)
├── server/
│   ├── src/
│   │   ├── index.ts                      ← EXISTING, add new routes
│   │   ├── routes/
│   │   │   ├── chat.ts                   ← NEW
│   │   │   ├── projects.ts               ← NEW
│   │   │   └── share.ts                  ← NEW
│   │   ├── lib/
│   │   │   ├── llm.ts                    ← NEW (LLM call abstraction)
│   │   │   └── supabase.ts               ← NEW (server-side Supabase)
│   │   └── middleware/
│   │       └── auth.ts                   ← NEW (Firebase JWT validation)
```

---

## 9. Dependencies to Add

### Frontend (`ui/`)
```json
{
  "zustand": "^4.x",
  "react-resizable-panels": "^2.x",
  "react-diff-viewer-continued": "^4.x",
  "firebase": "^10.x",
  "@supabase/supabase-js": "^2.x",
  "react-router-dom": "^6.x",
  "diff": "^5.x",
  "cmdk": "^1.x"
}
```

### Backend (`server/`)
```json
{
  "@supabase/supabase-js": "^2.x",
  "firebase-admin": "^12.x"
}
```

---

## 10. Environment Variables

### Frontend (`ui/.env`)
```
VITE_API_URL=http://localhost:8787
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Backend (`server/.dev.vars`)
```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

---

## 11. Database Schema (Supabase / PostgreSQL)

```sql
-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,           -- Firebase UID
  name TEXT NOT NULL,
  description TEXT,
  strudel_code TEXT NOT NULL DEFAULT '',
  bpm INTEGER,
  key TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat History
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  code_diff JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Code Versions
CREATE TABLE code_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT,
  created_by TEXT NOT NULL CHECK (created_by IN ('user', 'ai')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can only access their own projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON projects USING (user_id = auth.uid()::text);
CREATE POLICY "public read" ON projects FOR SELECT USING (is_public = true);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON chat_messages USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text)
);
ALTER TABLE code_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own versions" ON code_versions USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text)
);
```

---

## 12. UX & Design Guidelines

- **Color palette**: dark theme only (matches existing toaster dark aesthetic)
  - Background: `#0a0a0a`
  - Surface: `#111111`, `#1a1a1a`
  - Accent: electric purple `#8b5cf6` (primary) + cyan `#06b6d4` (secondary)
  - Text: `#f5f5f5` primary, `#a1a1aa` muted
- **Font**: `JetBrains Mono` for code, `Inter` for UI (add to index.html)
- **Animations**: subtle — use Tailwind `transition-all duration-200`, no heavy framer-motion
- **Spacing**: generous — panels should not feel cramped, use `p-4` minimum
- **Keyboard shortcuts**:
  - `Space` — Play / Stop
  - `Cmd/Ctrl+S` — Save version
  - `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` — Undo / Redo
  - `Cmd/Ctrl+Enter` — Send chat message
  - `Cmd/Ctrl+E` — Export
  - `Cmd/Ctrl+/` — Toggle parameter panel
- **Responsive breakpoints**:
  - `≥1280px`: full dual-panel layout
  - `768px–1279px`: editor full width, chat collapsed to bottom drawer
  - `<768px`: mobile — stacked, chat hidden behind FAB button

---

## 13. Implementation Notes for Agent

1. **Preserve all existing Toaster code** — do not rewrite `StrudelEditor.tsx` or `HalVisualization.tsx` from scratch. Extend and wrap.
2. **The `StrudelEditor` component already exposes** play, stop, undo, redo, setCode, getCurrentCode, cycle info — use all of these hook-style callbacks.
3. **BPM detection**: `setcps(x)` → BPM = `x * 240`. Parse this from code on every code change.
4. **Section detection**: regex scan for `// \[(\w+)\]` comments to extract section labels.
5. **Parameter detection**: regex scan for patterns like `.gain(0.8)`, `.speed(1.5)`, `setcps(0.5)` to surface in ParameterPanel.
6. **Diff preview**: use string comparison between `currentCode` and `aiProposedCode` — compute line-level diff using `diffLines` from `diff` npm package.
7. **Auto-save**: use `useEffect` with `setTimeout` debounce (3000ms) on code changes, calling `PUT /api/projects/:id`.
8. **Guest mode**: store `currentProject` in `localStorage` if user is not authenticated; prompt to sign in when saving to server.
9. **Strudel structured output**: the system prompt must be very explicit about returning JSON with `has_code_change`, `code`, `message`, `diff_summary` — include few-shot examples in the prompt.
10. **Error handling**: Strudel errors are already surfaced via `onStrudelError` — pipe these to a toast notification + error badge in topbar.
11. **First thing the agent must do**: fork/copy `VoloBuilds/toaster` codebase into this repo's `ui/` and `server/` directories as the starting base, then layer in all new files per the file structure in Section 8.

---

## 14. Stretch Goals (Post-MVP, marked TODO in code)

- [ ] **WAV export** via `OfflineAudioContext` render
- [ ] **MIDI export** from Strudel pattern data
- [ ] **Collaborative editing** (multi-user real-time via Supabase Realtime)
- [ ] **Voice input** — speak music instructions via Web Speech API
- [ ] **AI song starters** — gallery of AI-generated starter prompts / genre templates
- [ ] **Pattern library** — save reusable Strudel snippets per user
- [ ] **Mobile app** (React Native + Expo — same Strudel WASM)
- [ ] **Plugin system** — drop in custom Strudel effects/samples
- [ ] **LLM provider selector** — swap between OpenAI GPT-4o, Anthropic Claude, local Ollama

---

*This spec is the single source of truth for the `strudelussy` implementation. An agent should be able to implement this fully without additional clarification. All ambiguities are intentionally resolved above.*
