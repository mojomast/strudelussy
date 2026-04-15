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
| **Inject button** | Calls existing `onInjectCode(scaffold)` prop already in `EditorPanel` |
| **Validate button** | Reads current editor value via `editorRef.current.getValue()` (CodeMirror API) |
| **Spotlight overlay** | Renders as a `<Portal>` in `DAWShell` root, z-index above all panels |
| **Progress badge** | Show lesson count badge on the `[Learn]` tab button, e.g. `Learn (3/40)` |
| **AI Chat hook** | When user asks about a function, agent offers a deep-link: "Want to learn `.room()` interactively? → [Open Lesson 6.1]" |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl+Shift+T` | Toggle tutorial panel (switches chat tab to Learn) |

Add to `ShortcutsOverlay.tsx`.

---

## Non-Negotiables

- **NO** external tutorial/onboarding libraries (no Shepherd.js, Intro.js, Joyride) — built from scratch
- **NO** new npm packages unless already installed
- All 40 lessons must use **real, verified Strudel code** from the official docs
- Each lesson scaffold must be understandable in 30 seconds (max 6 lines)
- The feature must be entirely removable — single directory + clean integration points
- TypeScript strict throughout — no `any`
