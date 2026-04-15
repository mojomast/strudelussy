# Tutorial Curriculum — 7 Chapters, 40 Lessons

> **All code examples verified against official Strudel docs.**
> Source: https://strudel.cc/workshop/ and https://strudel.cc/learn/
> See also: [Overview](./TUTORIAL_OVERVIEW.md) · [Data Spec](./TUTORIAL_DATA_SPEC.md)

---

## Chapter Unlock Rules

Chapters unlock sequentially. A chapter unlocks when the **previous chapter is 60%+ complete** (not 100%, to avoid blocking users on hard lessons).

Progress is persisted to `localStorage` key: `strudelussy:tutorialProgress`

---

## Chapter 1 — Your First Sound *(5 lessons)*

**Goal:** User plays their first drum beat and understands cycles.

| ID | Title | Concept | Scaffold Code | Success Condition |
|---|---|---|---|---|
| 1.1 | Hello, Kick Drum | `s()` function, audio samples | `s("bd")` | Any non-empty `s()` call plays |
| 1.2 | Sequences | Space = sequence in a cycle | `s("bd sd")` | 3+ tokens in `s()` string |
| 1.3 | Drum Vocabulary | `bd sd hh oh rim lt mt ht` | `s("bd hh sd oh")` | Any known drum name used |
| 1.4 | Drum Machines | `.bank()` modifier | `s("bd sd hh").bank("RolandTR909")` | `.bank(` appears in code |
| 1.5 | Your First Beat | Free composition | `s("bd hh*2 sd hh")` | `s(` present + `*` or `,` used |

**Spotlight overlays:** Lesson 1.1 (Play button), Lesson 1.4 (bank accordion in sidebar)

---

## Chapter 2 — Mini-Notation *(8 lessons)*

**Goal:** User can write any rhythmic pattern using mini-notation syntax.

Reference: https://strudel.cc/learn/mini-notation/

| ID | Title | Concept | Scaffold Code | Validator Pattern |
|---|---|---|---|---|
| 2.1 | Sub-sequences | `[]` nesting | `s("bd [hh hh] sd [hh bd]")` | `\[` inside quoted string |
| 2.2 | Speed & Repetition | `*` multiplication | `s("hh*4, bd sd")` | `\*\d` in code |
| 2.3 | Rests | `~` silence | `s("bd ~ sd ~")` | `~` in quoted string |
| 2.4 | Angle Brackets | `<>` one-per-cycle rotation | `s("<bd hh rim oh bd rim>")` | `<` and `>` in code |
| 2.5 | Parallel Patterns | `,` comma stacking | `s("hh hh hh, bd sd")` | `,` inside quoted string |
| 2.6 | Elongation | `@` temporal weight | `note("<[g3,b3,e4]@2 [a3]>*2")` | `@\d` in code |
| 2.7 | Replication | `!` repeat without speed | `note("<[g3,b3,e4]!2 [a3]>*2")` | `!\d` in code |
| 2.8 | Euclidean Rhythms | `(beats,segments,offset)` | `s("bd(3,8), hh(5,8), sd(2,8)")` | `/\(\d+,\d+/` in code |

---

## Chapter 3 — Notes & Melody *(6 lessons)*

**Goal:** User can write melodic patterns using note names, numbers, and scales.

Reference: https://strudel.cc/learn/notes/

| ID | Title | Concept | Scaffold Code | Validator Pattern |
|---|---|---|---|---|
| 3.1 | Note Names | `note()` with letter notation | `note("c e g b")` | `note(` with letter names |
| 3.2 | Octaves | `c3 c4 c5` notation | `note("c3 e3 g3 b3 c4")` | `/[a-g][0-9]/i` in code |
| 3.3 | The `n()` Function | MIDI numbers + scale degrees | `n("0 2 4 7").scale("C:minor")` | `n(` AND `.scale(` present |
| 3.4 | Scales | `.scale()` method | `n("0 1 2 3 4 5 6 7").scale("D:major")` | `.scale("` with any scale name |
| 3.5 | Chords | `,` for polyphony | `note("[c3,e3,g3] [a2,c3,e3]")` | `note(` with `,` in string |
| 3.6 | Chord Voicings | `.voicings()` | `"<Am7 Em7 Dm7 G7>".voicings('lefthand').note()` | `.voicings(` present |

---

## Chapter 4 — Stacking & Structure *(5 lessons)*

**Goal:** User can build a full multi-layer pattern using `stack()`.

| ID | Title | Concept | Scaffold Code | Validator Pattern |
|---|---|---|---|---|
| 4.1 | Stack Basics | `stack()` plays patterns simultaneously | `stack(s("bd sd"), note("c e g"))` | `stack(` present |
| 4.2 | Drums + Bass | Stack drums with bassline | *(full scaffold — see below)* | `stack(` + `s(` + `note(` or `n(` |
| 4.3 | Slow & Fast | `.slow()` and `.fast()` | `s("bd sd hh hh").slow(2)` | `\.slow\(` or `\.fast\(` |
| 4.4 | Comments | `//` for labelling sections | `// Drums\ns("bd sd hh")` | `//` in code |
| 4.5 | Full Arrangement | All layers combined | *(full scaffold — see below)* | `stack(` with 3+ args |

**4.2 Scaffold:**
```javascript
stack(
  s("bd sd hh hh"),
  note("c2 ~ c2 e2").s("sawtooth").lpf(400)
)
```

**4.5 Scaffold:**
```javascript
stack(
  s("bd sd hh hh"),
  note("c2 ~ c2 e2").s("sawtooth").lpf(400).gain(.7),
  note("<[c4,e4,g4] [a3,c4,e4]>").slow(2).s("piano").gain(.5)
)
```

---

## Chapter 5 — Sound Design *(6 lessons)*

**Goal:** User understands synths, ADSR, and waveforms.

Reference: https://strudel.cc/learn/synths/

| ID | Title | Concept | Scaffold Code | Validator Pattern |
|---|---|---|---|---|
| 5.1 | Waveforms | `sine sawtooth square triangle` | `note("c e g").s("sawtooth")` | `.s("sawtooth"` or `square` or `triangle` or `sine` |
| 5.2 | ADSR Envelope | `.attack() .decay() .sustain() .release()` | `note("c e g").s("triangle").attack(.1).decay(.2)` | `.attack(` or `.decay(` or `.sustain(` |
| 5.3 | Volume | `.gain()` | `s("bd sd").gain(.5)` | `.gain(` present |
| 5.4 | Sample Speed | `.speed()` | `s("bd").speed(1.5)` | `.speed(` present |
| 5.5 | Filter | `.cutoff()` / `.lpf()` | `note("c e g").s("sawtooth").cutoff(800)` | `.cutoff(` or `.lpf(` |
| 5.6 | Noise | `white pink brown` noise sources | `s("white").gain(.1).cutoff(400)` | `"white"` or `"pink"` or `"brown"` |

---

## Chapter 6 — Effects *(5 lessons)*

**Goal:** User can apply reverb, delay, and FX chains confidently.

Reference: https://strudel.cc/learn/effects/

| ID | Title | Concept | Scaffold Code | Validator Pattern |
|---|---|---|---|---|
| 6.1 | Reverb | `.room()` | `s("bd sd hh").room(.5)` | `.room(` present |
| 6.2 | Delay | `.delay()` + `.delaytime()` | `note("c e g").delay(.5).delaytime(.25)` | `.delay(` present |
| 6.3 | Distortion | `.shape()` / `.crush()` | `s("sd").shape(.4)` | `.shape(` or `.crush(` |
| 6.4 | Panning | `.pan()` | `s("hh*8").pan(sine.slow(4))` | `.pan(` present |
| 6.5 | FX Chains | Chaining 3+ effects | *(full scaffold — see below)* | 3+ of: `.room(` `.delay(` `.shape(` `.pan(` `.cutoff(` |

**6.5 Scaffold:**
```javascript
note("<[c4,e4,g4] [a3,c4,e4]>").slow(2)
  .s("sawtooth")
  .cutoff(sine.slow(8).range(200, 2000))
  .room(.6)
  .delay(.3).delaytime(.25)
  .pan(sine.slow(16))
  .gain(.7)
```

---

## Chapter 7 — Signals & Randomness *(5 lessons)*

**Goal:** User can animate patterns with `sine`, `perlin`, `rand`, and `sometimes`.

Reference: https://strudel.cc/learn/signals/

| ID | Title | Concept | Scaffold Code | Validator Pattern |
|---|---|---|---|---|
| 7.1 | Sine Modulation | `sine.range().slow()` | `note("c e g").cutoff(sine.slow(4).range(200,2000))` | `sine` AND `.slow(` |
| 7.2 | Perlin Noise | `perlin.range()` | `s("hh*8").speed(perlin.range(.8,1.2))` | `perlin` AND `.range(` |
| 7.3 | Probability | `?` random gate | `s("bd? sd hh? hh")` | `?` inside quoted string |
| 7.4 | Sometimes | `.sometimes()` `.rarely()` `.often()` | `s("bd sd hh").sometimes(x => x.fast(2))` | `.sometimes(` or `.rarely(` or `.often(` |
| 7.5 | Pattern Arguments | Passing pattern string to method | `s("bd sd").gain("<.3 .7 .5 1>")` | method contains quoted string with spaces or operators |

---

## Function → Lesson Cross-Reference

Used by the AI chat deep-link system in `ChatPanel.tsx`. Export as `FUNCTION_LESSON_MAP` from `tutorialData.ts`.

```typescript
export const FUNCTION_LESSON_MAP: Record<string, string> = {
  // Chapter 1
  's(': '1.1', 'sound(': '1.1', '.bank(': '1.4',
  // Chapter 2  
  'euclidean': '2.8', '(beats,': '2.8',
  // Chapter 3
  'note(': '3.1', '.scale(': '3.3', 'n(': '3.3', '.voicings(': '3.6',
  // Chapter 4
  'stack(': '4.1', '.slow(': '4.3', '.fast(': '4.3',
  // Chapter 5
  '.attack(': '5.2', '.decay(': '5.2', '.sustain(': '5.2', '.release(': '5.2',
  '.gain(': '5.3', '.speed(': '5.4', '.cutoff(': '5.5', '.lpf(': '5.5',
  // Chapter 6
  '.room(': '6.1', '.reverb(': '6.1', '.delay(': '6.2',
  '.shape(': '6.3', '.crush(': '6.3', '.pan(': '6.4',
  // Chapter 7
  'sine': '7.1', 'cosine': '7.1', 'perlin': '7.2',
  'rand': '7.3', '.sometimes(': '7.4', '.rarely(': '7.4', '.often(': '7.4',
  '.degradeBy(': '7.4',
}
```
