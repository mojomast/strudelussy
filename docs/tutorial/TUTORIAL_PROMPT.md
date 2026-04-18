# Tutorial Feature — Opus Build Prompt

> This is the complete prompt to give Claude Opus 4.6 to build the tutorial feature.
> All technical details are in the sibling markdown files — this prompt references them directly.
>
> **Sibling docs (read these first):**
> - [`TUTORIAL_OVERVIEW.md`](./TUTORIAL_OVERVIEW.md) — Vision, architecture, integration points, constraints
> - [`TUTORIAL_CURRICULUM.md`](./TUTORIAL_CURRICULUM.md) — All 40 lessons, scaffolds, and validator patterns
> - [`TUTORIAL_COMPONENTS.md`](./TUTORIAL_COMPONENTS.md) — UI layouts, behaviors, CSS
> - [`TUTORIAL_DATA_SPEC.md`](./TUTORIAL_DATA_SPEC.md) — TypeScript types, state hook API, localStorage spec

---

```
You are building a complete in-app tutorial feature for **shoedelussy**.
Repository: https://github.com/mojomast/shoedelussy

Before writing a single line of code, read ALL of the following spec files
from the repository. They are your complete source of truth — do not deviate
from them, and do not invent details not found in them.

Spec files to read (all in docs/tutorial/):
  1. TUTORIAL_OVERVIEW.md    — vision, file structure, integration points, constraints
  2. TUTORIAL_CURRICULUM.md  — all 40 lessons across 7 chapters, scaffold code, validator patterns
  3. TUTORIAL_COMPONENTS.md  — UI layouts, component behaviors, CSS animations
  4. TUTORIAL_DATA_SPEC.md   — TypeScript types, useTutorial hook API, localStorage spec

Official Strudel docs (source of truth for all lesson content and code examples):
  - https://strudel.cc/workshop/getting-started/
  - https://strudel.cc/workshop/first-sounds/
  - https://strudel.cc/learn/mini-notation/
  - https://strudel.cc/learn/effects/
  - https://strudel.cc/learn/synths/
  - https://strudel.cc/learn/sounds/
  - https://strudel.cc/learn/factories/
  - https://strudel.cc/recipes/recipes/

---

## PHASE 0 — SUBAGENT: Full Audit

Deploy a subagent to complete ALL of the following before any code is written:

### 0A — Read the spec files
Read every spec file listed above in full. Do not summarize — read completely.
After reading, confirm:
- The full file/component structure from TUTORIAL_OVERVIEW.md
- All 40 lesson IDs and their validator regex from TUTORIAL_CURRICULUM.md
- All component layout specs from TUTORIAL_COMPONENTS.md
- All TypeScript types and the full useTutorial API from TUTORIAL_DATA_SPEC.md

### 0B — Read the existing codebase
Read these files in full from the shoedelussy repository:
  - `ui/src/components/ChatPanel.tsx`
  - `ui/src/components/EditorPanel.tsx`
  - `ui/src/components/DAWShell.tsx`
  - `ui/src/pages/HomePage.tsx`
  - `ui/src/index.css`

Document:
- The exact prop signature for injecting code into the editor (look for `onInjectCode` or similar)
- The exact method to read current editor value from the CodeMirror ref
- All existing `--ussy-*` CSS custom properties defined in `index.css`
- How ChatPanel receives and renders its content (so you can add the tab switcher cleanly)
- Any existing keyboard shortcut handler locations (for adding `Cmd+Shift+T`)

### 0C — Verify Strudel examples
For each scaffold code example in TUTORIAL_CURRICULUM.md, verify it matches syntax from
the official Strudel docs. Flag any example that looks incorrect before proceeding.

Do not start Phase 1 until this audit is complete and documented.

---

## PHASE 1 — SUBAGENT: Data Layer

Create `ui/src/features/tutorial/tutorialData.ts`.

Requirements (all from TUTORIAL_DATA_SPEC.md and TUTORIAL_CURRICULUM.md):

1. Use the exact TypeScript types defined in TUTORIAL_DATA_SPEC.md:
   `LessonId`, `ChapterId`, `ValidationResult`, `Lesson`, `Chapter`
   Export `UNLOCK_THRESHOLD = 0.6`

2. Implement ALL 40 lessons across 7 chapters as defined in TUTORIAL_CURRICULUM.md.
   For each lesson:
   - `id`: exactly as specified (e.g. `"1.3"`, `"6.5"`)
   - `scaffold`: real, verified Strudel code from the official docs. Max 6 lines.
   - `hints`: array of 2–3 hints, progressing from vague to specific
   - `instructions`: max 60 words, plain language
   - `validator`: use the regex patterns from the Validator Patterns Reference table
     in TUTORIAL_DATA_SPEC.md. Every scaffold must PASS its own validator.
   - `spotlightTarget`: only for lessons 1.1 and 1.4
     - 1.1: use `'[aria-label="Play"]'` or the selector that matches the transport play button
     - 1.4: use the selector that matches the bank section in the sidebar (check DAWShell)

3. Export `FUNCTION_LESSON_MAP` exactly as defined in TUTORIAL_CURRICULUM.md.

4. Sanity check: after writing all validators, confirm that calling
   `lesson.validator(lesson.scaffold)` returns `{ pass: true }` for every lesson.
   If any fail, fix the validator (NOT the scaffold).

Create `ui/src/features/tutorial/index.ts` with the barrel export from TUTORIAL_DATA_SPEC.md.

---

## PHASE 2 — SUBAGENT: State Hook

Create `ui/src/features/tutorial/useTutorial.ts`.

Requirements (all from TUTORIAL_DATA_SPEC.md):

1. Implement the full `TutorialState` interface exactly as specified
2. Implement ALL methods in `UseTutorialReturn` exactly as specified:
   `openTutorial`, `closeTutorial`, `setActiveTab`, `nextLesson`, `prevLesson`,
   `completeLesson`, `getScaffold`, `validateLesson`, `revealNextHint`,
   `resetActivityTimer`, `openProgressMap`, `closeProgressMap`
3. `isChapterUnlocked`: returns true for chapter 1 always; for others,
   previous chapter must have ≥ `UNLOCK_THRESHOLD` (60%) of lessons completed
4. `incompleteCount`: total lessons across all chapters NOT in `completedLessons`
5. Implement localStorage persistence exactly as specified in TUTORIAL_DATA_SPEC.md:
   - Key: `shoedelussy:tutorialProgress`
   - Read on init with try/catch
   - Write debounced 500ms using a `useRef` timer (NOT a new setTimeout every render)
6. Implement auto-hint timer exactly as in TUTORIAL_DATA_SPEC.md:
   - `setInterval` every 5 seconds
   - Reveals next hint if `Date.now() - lastActivity > 30_000`
   - Stops when `hintLevel >= currentLesson.hints.length`
7. TypeScript strict — no `any`. All types imported from `tutorialData.ts`.

---

## PHASE 3 — SUBAGENT: TutorialPanel

Create `ui/src/features/tutorial/TutorialPanel.tsx`.

Requirements (all from TUTORIAL_COMPONENTS.md):

1. Implement the exact layout shown in TUTORIAL_COMPONENTS.md § TutorialPanel.tsx
2. Use ONLY `--ussy-*` CSS custom properties for colors (no hardcoded hex values)
3. Use existing shadcn components — do NOT install new packages
4. Implement all behaviors from TUTORIAL_COMPONENTS.md:
   - Inject button with inline confirm prompt (no browser `confirm()`)
   - Validate button with pass/fail animations
   - Pass animation sequence: flash → confetti → auto-advance after 1200ms
   - Hint system: hidden by default, auto-reveal at 30s, progressive 3 levels
   - Progress bar with CSS transition
   - Step indicator dots
   - Scaffold preview in `<pre>` block
5. Confetti uses pure CSS classes from TUTORIAL_COMPONENTS.md § CSS Requirements
   — do NOT use any external confetti library
6. Shake animation uses `.tutorial-shake` class from TUTORIAL_COMPONENTS.md § CSS Requirements
7. All text left-aligned. Panel scrollable on overflow.
8. Props required by this component:
   - `onInjectCode: (code: string) => void` — from EditorPanel
   - `getEditorCode: () => string` — returns current editor value
   - All tutorial state and actions from `useTutorial` hook

---

## PHASE 4 — SUBAGENT: TutorialOverlay

Create `ui/src/features/tutorial/TutorialOverlay.tsx`.

Requirements (all from TUTORIAL_COMPONENTS.md § TutorialOverlay.tsx):

1. Only render when `lesson.spotlightTarget` is defined AND lesson ID is `"1.1"` or `"1.4"`
2. Use the CSS `box-shadow` cutout technique shown in TUTORIAL_COMPONENTS.md
3. Implement `ResizeObserver` re-render on target element resize
4. `pointer-events: none` on dim layer, `pointer-events: auto` on tooltip and cutout
5. Dismissal stored to `localStorage` key `shoedelussy:seenOverlays` as `string[]`
6. After 3 total dismissals, set a flag `shoedelussy:overlaysDisabled = 'true'`
   and never render overlays again
7. Must NOT block keyboard shortcuts
8. Tooltip card styling: `--ussy-surface-2` bg, `--ussy-text` text, `--radius-lg`, `--shadow-lg`

---

## PHASE 5 — SUBAGENT: TutorialProgress Modal

Create `ui/src/features/tutorial/TutorialProgress.tsx`.

Requirements (all from TUTORIAL_COMPONENTS.md § TutorialProgress.tsx):

1. Use shadcn `Dialog` component
2. Display all 7 chapters in a responsive grid (3 columns desktop, 1 column mobile)
3. Chapter card states:
   - Completed (all lessons done): ✅ emoji + full progress bar
   - In progress (1+ lessons done): 🔓 emoji + partial progress bar + [Continue →] button
   - Locked (previous chapter < 60%): 🔒 emoji + `opacity-40 cursor-not-allowed`
4. Chapter emojis: Ch1 🥁, Ch2 🎼, Ch3 🎵, Ch4 📐, Ch5 🎛, Ch6 ✨, Ch7 🎲
5. [Continue] / [Resume] calls `openTutorial(firstIncompleteLessonId)` then closes modal
6. `firstIncompleteLessonId`: first lesson in chapter where `!completedLessons.has(lessonId)`

---

## PHASE 6 — SUBAGENT: Integration

Modify existing files to wire the tutorial feature into the app.

### 6A — ChatPanel.tsx
Add the `[Chat] [Learn]` tab switcher to the ChatPanel header.
Exact JSX shown in TUTORIAL_COMPONENTS.md § ChatPanel Tab Bar Integration.

Behavior:
- `activeTab` state (`'chat' | 'learn'`) lives inside ChatPanel
- When `activeTab === 'learn'`, render `<TutorialPanel />` instead of chat messages
- Pass `incompleteCount` from `useTutorial()` to the badge
- The existing chat functionality must be completely unaffected when `activeTab === 'chat'`

Also add the AI Chat deep-link feature:
Exact logic from TUTORIAL_COMPONENTS.md § AI Chat Deep-Link.
- Scan AI response text for keys from `FUNCTION_LESSON_MAP`
- Only scan AI responses, NOT user messages
- Show first match only, as a subtle `text-[var(--ussy-accent)]` button below the message

### 6B — EditorPanel.tsx
Verify that `onInjectCode` (or the equivalent prop found in Phase 0) works correctly.
If the editor currently has unsaved changes when inject is called, the confirmation
prompt must be shown inline (not via browser `confirm()`). This is already spec'd in
TUTORIAL_COMPONENTS.md — implement if not already done.

Also expose `getEditorCode: () => string` to the parent if not already available.

### 6C — HomePage.tsx
Instantiate `useTutorial()` at the page level.
Pass required props to ChatPanel and EditorPanel:
- `onInjectCode` → EditorPanel callback → ChatPanel → TutorialPanel
- `getEditorCode` → EditorPanel getter → ChatPanel → TutorialPanel
- `tutorialState` → from `useTutorial()` → ChatPanel

Also render `<TutorialOverlay />` at the page root level (as a sibling to DAWShell),
so its fixed positioning works correctly.

### 6D — ShortcutsOverlay.tsx
Add `Cmd+Shift+T` / `Ctrl+Shift+T` → "Toggle Tutorial Panel" to the shortcuts list.
Wire the keyboard handler to call `openTutorial()` / `setActiveTab('learn')`.

### 6E — index.css
Add the CSS animations from TUTORIAL_COMPONENTS.md § CSS Requirements:
- `@keyframes confetti-fall` and `.tutorial-confetti span` styles
- `@keyframes tutorial-shake` and `.tutorial-shake` class
- `@media (prefers-reduced-motion: reduce)` block disabling both

Do NOT remove or modify any existing `--ussy-*` tokens.

---

## PHASE 7 — SUBAGENT: QA & TypeScript

1. **Validator sanity check** — for every lesson in `tutorialData.ts`, call
   `lesson.validator(lesson.scaffold)` and confirm `pass === true`. Fix any failures.

2. **TypeScript strict check** — no `any` types anywhere in the new feature.
   All `LessonId` values are string literals matching the curriculum.
   All `ChapterId` values are numbers 1–7.

3. **Integration verification:**
   - Chat tab still works when `activeTab === 'chat'`
   - `onInjectCode` successfully replaces editor content
   - `getEditorCode()` returns the current raw code string from CodeMirror
   - Keyboard shortcut `Cmd+Shift+T` toggles the Learn tab
   - Progress map modal opens from [Progress Map] button
   - Chapter lock/unlock logic works correctly (60% threshold)

4. **localStorage resilience:**
   - Wrap ALL `localStorage.getItem` calls in try/catch
   - If JSON.parse fails, fall back to default state (Ch1, Lesson 1.1, no completions)
   - If `localStorage` is unavailable (private browsing), catch the error and continue
     with in-memory state only

5. **Reduced motion check:**
   - Confirm `@media (prefers-reduced-motion: reduce)` disables confetti and shake
   - Confirm auto-hint timer still functions (it's not an animation)

6. **Accessibility:**
   - All accordion/collapse controls have `aria-expanded` and `aria-controls`
   - Validate button has `aria-label="Check my code"`
   - Step indicator dots have `aria-label="Lesson X of Y"`
   - Progress bar has `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
   - Overlay "Got it" button has `aria-label="Dismiss tutorial spotlight"`
   - All icon-only buttons have `aria-label`

---

## Deliverables

For each phase, provide:
1. Complete file contents (no partial diffs)
2. A `// What changed:` comment block at the top of every modified file
3. Any `pnpm add` commands needed (there should be none — all deps already installed)

Final output: a summary of all new and modified files suitable for a git commit message.

---

## Hard Constraints (from TUTORIAL_OVERVIEW.md)

- NO external tutorial/onboarding libraries
- NO new npm packages
- All lesson scaffold code must be real, verified Strudel syntax
- The feature must be entirely contained in `ui/src/features/tutorial/`
  with clean integration points only in: ChatPanel, EditorPanel, HomePage, ShortcutsOverlay, index.css
- TypeScript strict throughout — no `any`
- Do NOT modify LegacyDAWShell.tsx
- Do NOT modify the server, store, or hook layer outside of tutorial
- Provide complete rewritten files, not partial diffs
```
