# Tutorial Components — UI Spec

> See also: [Overview](./TUTORIAL_OVERVIEW.md) · [Curriculum](./TUTORIAL_CURRICULUM.md) · [Data Spec](./TUTORIAL_DATA_SPEC.md)

All components live in `ui/src/features/tutorial/`. Use ALL `--ussy-*` CSS tokens (no hardcoded colors). Use existing shadcn components. No external onboarding libraries.

---

## TutorialPanel.tsx

The main teaching UI. Renders inside the left `ChatPanel` when the `[Learn]` tab is active.

### Layout

```
┌─────────────────────────────────────────────┐
│  📚 Learn Strudel        [Progress Map]      │  ← header
├─────────────────────────────────────────────┤
│  Ch 2 · Mini-Notation   ████████░░░  3/8    │  ← chapter + progress bar
├─────────────────────────────────────────────┤
│                                             │
│  2.4 — Angle Brackets                       │  ← lesson title
│                                             │
│  [instruction text — max 60 words]          │  ← plain language instructions
│                                             │
│  ┌─────────────────────────────────────┐    │  ← scaffold preview (read-only)
│  │  s("<bd hh rim oh bd rim>")         │    │     displayed in <pre> block
│  └─────────────────────────────────────┘    │
│                [Load into editor ↗]         │  ← inject button
│                                             │
│  💡 [Show hint]  ← appears after 30s        │  ← hint reveal link
│                                             │
│  Hints:                                     │  ← shown when hintLevel > 0
│  • Wrap your sequence in < and > symbols    │
│                                             │
│  [✓ Check my code]                          │  ← validate button
│                                             │
│  ─────────────────────────────────────────  │
│  [← Prev]                     [Next →]      │  ← navigation
└─────────────────────────────────────────────┘
```

### Key Behaviors

**Inject button:**
- Calls `onInjectCode(lesson.scaffold)` from `EditorPanel`
- On first use, show inline confirm prompt: `"Replace current code? [Yes] [Cancel]"` — NOT a browser `confirm()` dialog
- After injecting, show a small toast: `"Loaded into editor!"`

**Validate button (✓ Check my code):**
- Calls `validateLesson(lessonId, currentEditorCode)`
- **On pass:** Green checkmark animation + `"🎉 Nice! You nailed it."` message + `"Next lesson →"` button appears
- **On fail:** Horizontal shake animation (`@keyframes shake`) + reveal next hint level

**Pass animation sequence:**
1. Flash validate button to green for 600ms
2. Render 8 `<span>` confetti elements with `@keyframes confetti-fall` (pure CSS, no library)
3. Wait 1200ms, then auto-advance to next lesson (reset `hintLevel` to 0)

**Hint system:**
- Hints hidden by default
- Reveal via `💡 Show hint` link (on demand)
- Auto-reveal after 30 seconds of no editor activity (tracked by `lastActivity` timestamp in `useTutorial`)
- Progressive: hint 1 is vague, hint 2 is more specific, hint 3 shows the answer

**Progress bar:**
```css
/* Inner fill div */
width: calc(${completedInChapter} / ${totalInChapter} * 100%);
background: var(--ussy-accent);
transition: width 400ms ease;
```

**Step indicator (bottom of panel):**
Show `○ ● ○ ○ ○` dots — filled = completed, current = filled with ring outline.

**Scaffold preview:**
```html
<pre style="font-family: monospace; background: var(--ussy-surface-2); ...">
  {lesson.scaffold}
</pre>
```

**All text must be left-aligned.** The panel is scrollable if content overflows.

---

## TutorialOverlay.tsx

Spotlight overlay for the first two spotlight lessons only: `"1.1"` (Play button) and `"1.4"` (bank accordion).

Only rendered when `lesson.spotlightTarget` is defined AND `lesson.id` is one of the above.

### Implementation

```tsx
// 1. Get target bounding rect
const target = document.querySelector(lesson.spotlightTarget)
const rect = target?.getBoundingClientRect()

// 2. Full-screen dim layer
<div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
  {/* CSS box-shadow cutout technique */}
  <div style={{
    position: 'absolute',
    top: rect.top - 8,
    left: rect.left - 8,
    width: rect.width + 16,
    height: rect.height + 16,
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 0 0 100vmax oklch(0 0 0 / 0.7)',
    pointerEvents: 'auto'
  }} />
  
  {/* Tooltip card below target */}
  <div style={{ position: 'absolute', top: rect.bottom + 12, left: rect.left, pointerEvents: 'auto' }}>
    <p>{lesson.hints[0]}</p>
    <button onClick={dismissOverlay}>Got it</button>
  </div>
</div>
```

### Behaviors
- Re-render on `ResizeObserver` window resize
- `pointer-events: none` on dim layer, `pointer-events: auto` on tooltip + cutout only
- Dismissal stored in `localStorage: strudelussy:seenOverlays` as a `string[]` of seen lesson IDs
- After 3 dismissals, overlays stop appearing permanently
- Must NOT block keyboard shortcuts

---

## TutorialProgress.tsx

Chapter map modal. Opened via the `[Progress Map]` button in `TutorialPanel` header.

Use shadcn `Dialog` component.

### Layout

```
┌─────────────────────────────────────────────────────┐
│  📚 Your Learning Progress          [✕ Close]       │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ ✅ Ch 1       │ │ 🔓 Ch 2       │ │ 🔒 Ch 3       │ │
│  │ First Sound  │ │ Mini-Notation │ │ Notes        │ │
│  │ 5/5 ████████ │ │ 3/8 ███░░░░  │ │ 0/6 locked   │ │
│  │ [Resume →]   │ │ [Continue →] │ │              │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Behaviors
- Locked chapters: `opacity: 0.4`, `cursor: not-allowed`, no click action
- Chapter unlocks when previous chapter is ≥60% complete
- `"Continue"` / `"Resume"` calls `openTutorial(firstIncompleteLessonId)` and closes modal
- Chapter emoji icons: Ch1 🥁, Ch2 🎼, Ch3 🎵, Ch4 📐, Ch5 🎛, Ch6 ✨, Ch7 🎲

---

## ChatPanel Tab Bar Integration

Add tab switcher to `ChatPanel.tsx` header.

```tsx
<div className="flex border-b border-[var(--ussy-divider)]">
  <button
    className={`px-4 py-2 text-xs font-medium ${
      activeTab === 'chat'
        ? 'border-b-2 border-[var(--ussy-accent)] text-[var(--ussy-text)]'
        : 'text-[var(--ussy-text-muted)] hover:text-[var(--ussy-text)]'
    }`}
    onClick={() => setActiveTab('chat')}
  >Chat</button>
  
  <button
    className={`relative px-4 py-2 text-xs font-medium ${
      activeTab === 'learn'
        ? 'border-b-2 border-[var(--ussy-accent)] text-[var(--ussy-text)]'
        : 'text-[var(--ussy-text-muted)] hover:text-[var(--ussy-text)]'
    }`}
    onClick={() => setActiveTab('learn')}
  >
    Learn
    {incompleteCount > 0 && (
      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[var(--ussy-accent)] text-[8px] text-black flex items-center justify-center">
        {Math.min(incompleteCount, 9)}
      </span>
    )}
  </button>
</div>
```

When `activeTab === 'learn'`, render `<TutorialPanel />` in place of chat messages.

---

## AI Chat Deep-Link

In `ChatPanel.tsx`, after each AI response message, scan the response text for known Strudel function names using `FUNCTION_LESSON_MAP` (exported from `tutorialData.ts`). If a match is found, append a subtle inline button:

```tsx
{matchedLesson && (
  <button
    className="mt-2 text-xs text-[var(--ussy-accent)] hover:underline"
    onClick={() => openTutorial(matchedLesson)}
  >
    → Learn {matchedFunctionName} interactively (Lesson {matchedLesson})
  </button>
)}
```

Only show the first match per message. Do not scan user messages, only AI responses.

---

## CSS Requirements

Add to `ui/src/index.css`:

```css
/* Tutorial confetti */
@keyframes confetti-fall {
  0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(60px) rotate(720deg); opacity: 0; }
}
.tutorial-confetti span {
  position: absolute;
  width: 6px; height: 6px;
  border-radius: 1px;
  animation: confetti-fall 0.8s ease-out forwards;
}
.tutorial-confetti span:nth-child(1) { left: 10%; background: var(--ussy-accent); animation-delay: 0ms; }
.tutorial-confetti span:nth-child(2) { left: 25%; background: #facc15; animation-delay: 60ms; }
.tutorial-confetti span:nth-child(3) { left: 40%; background: var(--ussy-accent); animation-delay: 120ms; }
.tutorial-confetti span:nth-child(4) { left: 55%; background: #f97316; animation-delay: 30ms; }
.tutorial-confetti span:nth-child(5) { left: 70%; background: var(--ussy-accent); animation-delay: 90ms; }
.tutorial-confetti span:nth-child(6) { left: 85%; background: #facc15; animation-delay: 150ms; }
.tutorial-confetti span:nth-child(7) { left: 50%; background: #ef4444; animation-delay: 45ms; }
.tutorial-confetti span:nth-child(8) { left: 15%; background: #a78bfa; animation-delay: 75ms; }

/* Lesson validation shake */
@keyframes tutorial-shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}
.tutorial-shake {
  animation: tutorial-shake 0.4s ease;
}

@media (prefers-reduced-motion: reduce) {
  .tutorial-confetti span,
  .tutorial-shake { animation: none; }
}
```
