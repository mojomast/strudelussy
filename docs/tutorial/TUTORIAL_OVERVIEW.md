# Tutorial Feature — Overview & Vision

> **Source of truth for the strudelussy in-app Strudel learning system.**
> Related docs: [Curriculum](./TUTORIAL_CURRICULUM.md) · [Components](./TUTORIAL_COMPONENTS.md) · [Data Spec](./TUTORIAL_DATA_SPEC.md) · [Build Prompt](./TUTORIAL_PROMPT.md)

---

## Vision

The tutorial feature transforms users from **AI-dependent pattern consumers** into **independent Strudel composers**. The goal is not to replicate the official docs — it's to teach *within the context of their own code*, using the strudelussy editor as the live classroom.

Official Strudel learning resources (source of truth for all lesson content):
- https://strudel.cc/workshop/getting-started/
- https://strudel.cc/workshop/first-sounds/
- https://strudel.cc/learn/mini-notation/
- https://strudel.cc/learn/effects/
- https://strudel.cc/learn/synths/
- https://strudel.cc/learn/sounds/
- https://strudel.cc/learn/factories/
- https://strudel.cc/recipes/recipes/

---

## Design Philosophy

Three core principles drive every decision:

1. **Learn by doing, not reading** — every lesson ends with the user typing something and hearing a result
2. **Progressive disclosure** — start with one sound, one function; complexity compounds naturally
3. **Contextual, not front-loaded** — tutorials surface *when relevant*, not as a mandatory gate

---

## Architecture Overview

The tutorial system is a self-contained React feature (`ui/src/features/tutorial/`) that overlays the existing editor without replacing it.

```
ui/src/features/tutorial/
├── tutorialData.ts        ← all 40 lessons, validators, hints
├── TutorialPanel.tsx      ← main sidebar panel UI
├── TutorialOverlay.tsx    ← spotlight overlay system
├── TutorialProgress.tsx   ← chapter map modal
├── useTutorial.ts         ← state hook (current lesson, progress, localStorage)
└── index.ts               ← barrel export
```

| Layer | Component | Role |
|---|---|---|
| **Curriculum** | `tutorialData.ts` | Static lesson/chapter data (no server needed) |
| **Runner** | `useTutorial.ts` | Step state machine, progress, validation |
| **UI** | `TutorialPanel.tsx` + `TutorialOverlay.tsx` | Sidebar panel + contextual spotlight overlays |

---

## Integration Points

| Integration | How |
|---|---|
| **Left panel tab bar** | Add `[Chat] [Learn]` tab to `ChatPanel`'s header — `Learn` renders `<TutorialPanel />` |
| **Inject button** | Calls the shared page-level editor bridge wired through `HomePage` to replace the editor contents with the lesson scaffold |
| **Validate button** | Reads the live editor value via the shared page-level `getEditorCode()` bridge, with a debounced live validation result shown in the lesson panel and automatic lesson completion on pass |
| **Live typing apply** | While playback is running, manual editor typing triggers a debounced reevaluation after a short idle pause |
| **Inline autocomplete** | The editor offers Strudel-aware completions while typing, including static helpers plus live variables and track names, with `Ctrl/Cmd+Space` for explicit open and `Tab` to accept the selected completion |
| **Hover docs** | Hovering a known Strudel helper in the editor shows its signature, one-line description, and linked lesson reference when available |
| **Lesson token map** | The function-to-lesson token map lives in `ui/src/lib/functionLessonMap.ts` so editor extensions do not need to eagerly evaluate the full tutorial curriculum module |
| **Lesson scaffold sync** | Selecting a lesson replaces the editor contents with that lesson scaffold without auto-evaluating it |
| **Tutorial progress persistence** | `useTutorial.ts` persists completed lessons, the current lesson, and revealed hint count through `projectStorage.ts` localStorage helpers |
| **Spotlight overlay** | Renders at the page root as a fixed overlay sibling so it stays above all panels |
| **Progress badge** | Show a lesson count badge on the `[Learn]` tab button using the remaining lesson total |
| **AI Chat hook** | When user asks about a function, agent offers a deep-link: "Want to learn `.room()` interactively? → [Open Lesson 6.1]" |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl+Shift+T` | Toggle tutorial panel (switches chat tab to Learn) |
| `Ctrl/Cmd+Space` | Open Strudel autocomplete suggestions at the cursor |
| `Tab` | Accept selected autocomplete suggestion, or indent when autocomplete is closed |
| `Hover known helper` | Show a Strudel signature tooltip for recognized functions |

Add to `ShortcutsOverlay.tsx`.

---

## Non-Negotiables

- **NO** external tutorial/onboarding libraries (no Shepherd.js, Intro.js, Joyride) — built from scratch
- **NO** new npm packages unless already installed
- All 40 lessons must use **real, verified Strudel code** from the official docs
- Each lesson scaffold must be understandable in 30 seconds (max 6 lines)
- The feature must be entirely removable — single directory + clean integration points
- TypeScript strict throughout — no `any`
