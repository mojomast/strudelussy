# Spec: DMX MCP Integration

Status: proposed

Implementation note: the repo now contains a working first implementation of this spec, including a standalone `bridges/dmx-mcp` package, simulator and OLA backends, file-backed patch loading, a DMX visualization mode, a Becomussy DMX monitor/control panel, persisted project lighting bindings, and DMX help content in the frontend Learn/help surfaces.

## Goal

Add a development-first, production-capable DMX control path for Strudelussy using MCP, with simulators/emulators first and real hardware later.

## Primary Recommendation

Build a standalone in-repo package at `bridges/dmx-mcp/`.

This package is:

- an MCP server
- a local hardware-adjacent process
- the owner of DMX timing, safety, reconciliation, and backend selection

Strudelussy itself remains:

- the existing Cloudflare Worker MCP server for composition/project state
- an optional future source of persisted lighting metadata
- not the DMX transport runtime

## Why This Architecture

Strudelussy's existing backend in `server/` is a Cloudflare Worker (`server/src/index.ts`, `server/src/routes/mcp.ts`). That is a good fit for project state and existing MCP tools, but a poor fit for local DMX hardware, low-latency transport loops, or local services such as OLA.

The standalone bridge pattern keeps the boundaries clean:

- Strudelussy owns musical state and optional lighting intent.
- `dmx-mcp` owns lighting execution state.
- OLA, `sACN`, or `Art-Net` own the actual output path.

## Runtime Topology

### Development

```text
Agent / MCP client
  |- Strudelussy MCP server (/mcp)
  |- dmx-mcp bridge
       |- simulator backend
       |- OLA backend -> OLA Dummy
       |- optional visualizer via Art-Net or sACN
```

### UI Visualization Topology

Strudelussy currently renders the center visualization with `ui/src/components/HalVisualization.tsx`, mounted from `ui/src/pages/HomePage.tsx`, and fed by the audio analyser created in `ui/src/components/StrudelEditor.tsx`.

The DMX integration must not hard-wire the app to HAL.

Required UI direction:

- replace the current direct `HalVisualization` mount with a visualization interface that can render either:
  - the existing HAL/audio visualization, or
  - a DMX/OLA-backed universe visualization
- keep the shell slot stable so the center-column viz panel still works without layout changes
- make visualization data-source selection explicit, not implicit

Recommended shape:

```text
ui/src/components/visualization/
  VisualizationSurface.tsx
  HalVisualizationAdapter.tsx
  DmxVisualization.tsx
  types.ts
```

Where:

- `VisualizationSurface` is the stable panel entrypoint used by `HomePage.tsx`
- `HalVisualizationAdapter` wraps the existing HAL component
- `DmxVisualization` renders DMX universe / fixture state from the bridge or OLA-backed resources

This keeps the current HAL path working while making OLA/DMX visualization a first-class replacement, not a sidecar.

### Production

```text
Agent / MCP client
  |- Strudelussy MCP server (/mcp)
  |- dmx-mcp bridge on lighting host
       |- sACN backend -> Ethernet DMX node -> fixtures
       |- optional OLA backend -> USB widget / protocol conversion
```

## Recommended Repo Layout

```text
bridges/
  dmx-mcp/
    package.json
    src/
      index.ts
      server.ts
      config.ts
      patch.ts
      safety.ts
      operations.ts
      resources.ts
      tools/
        control.ts
        query.ts
      backends/
        types.ts
        simulator.ts
        ola.ts
        sacn.ts
        artnet.ts
      fixtures/
        model.ts
      tests/
ui/
  src/
    components/
      visualization/
        VisualizationSurface.tsx
        HalVisualizationAdapter.tsx
        DmxVisualization.tsx
        types.ts
```

The `sacn.ts` and `artnet.ts` files may be stubbed initially and implemented later.

## Tool Design

Principle: named fixtures, groups, and scenes are the primary control surface. Raw channel writes are secondary and unsafe.

### Required MVP tools

- `arm_output`
- `disarm_output`
- `apply_scene`
- `set_group_state`
- `blackout`
- `list_fixtures`
- `list_groups`
- `list_scenes`

### Deferred/admin-only tools

- `set_fixture_state`
- `write_universe_frame`
- `write_channels`
- `reload_patch`

### Tool contracts

All mutating tools must accept:

- `idempotency_key: string`
- `dry_run?: boolean`

Transition-capable tools should accept:

- `fade_ms?: number`
- `start_at?: string`

All mutating tools return a structured receipt:

```json
{
  "accepted": true,
  "operation_id": "op_123",
  "backend": "simulator",
  "desired_revision": 12,
  "dry_run": false,
  "safe_to_retry": true
}
```

## Resource Design

The bridge must expose these resources:

- `dmx://capabilities`
- `dmx://backends/current`
- `dmx://safety/interlocks`
- `dmx://patch`
- `dmx://universes/{id}/desired`
- `dmx://universes/{id}/observed`
- `dmx://operations/{id}`

For visualization support, the bridge should also expose either the same universe resources above or an additional visualization-oriented resource view derived from them:

- `dmx://visualization/universes/{id}`
- `dmx://visualization/fixtures`

Purpose:

- `desired` tells the client what the bridge intends to output.
- `observed` tells the client what the bridge believes it has actually emitted.
- `operations` allows async fades/effects to be tracked without polling tool text.
- visualization resources let the UI render DMX state without depending on audio analyser internals or HAL-specific drawing code.

Visualization requirement:

- the DMX visualization should prefer `observed` state when available
- if `observed` is unavailable for a backend, it may render `desired` state but must label that state clearly in its model

## Backend Interface

Each backend implements the same interface:

```ts
export interface DmxBackend {
  readonly name: 'simulator' | 'ola' | 'sacn' | 'artnet'
  initialize(): Promise<void>
  shutdown(): Promise<void>
  writeUniverse(universe: number, frame: Uint8Array): Promise<void>
  readObservedUniverse?(universe: number): Promise<Uint8Array | null>
}
```

### Backend plan

- `simulator`: first implementation, deterministic, records writes in memory and optionally on disk
- `ola`: first real integration backend; supports OLA Dummy in dev and OLA-managed hardware on Linux
- `sacn`: preferred production sink after MVP
- `artnet`: compatibility backend after `sacn`

## Patch and Fixture Model

Use a checked-in JSON or YAML patch file loaded by the bridge.

The same patch model should drive both output rendering and UI visualization. The app should not maintain a separate visualization-only fixture map.

MVP fixture model supports only:

- dimmer
- RGB
- RGBW
- optional strobe attribute with safety gating

Patch entity shape:

```json
{
  "universes": [1],
  "fixtures": [
    {
      "id": "wash_left_1",
      "name": "Wash Left 1",
      "universe": 1,
      "address": 1,
      "profile": "rgbw_dimmer_6ch",
      "group_ids": ["wash_left", "all_washes"]
    }
  ],
  "groups": [
    { "id": "all_washes", "fixture_ids": ["wash_left_1"] }
  ],
  "scenes": [
    {
      "id": "intro_blue",
      "targets": [
        {
          "group_id": "all_washes",
          "attributes": { "dimmer": 180, "red": 0, "green": 0, "blue": 255, "white": 0 }
        }
      ]
    }
  ]
}
```

## Safety Model

Required rules:

1. Output starts disarmed.
2. Non-simulated output requires explicit `arm_output`.
3. `blackout` is always available and must have priority.
4. Strobe attributes are blocked unless explicitly enabled by config.
5. Universe allowlist is mandatory.
6. Channel values are clamped to `0..255`.
7. Output frame rate is globally capped.
8. On startup and shutdown, optionally emit blackout.
9. Mutations require idempotency keys.
10. Raw write tools are disabled by default.

## State Model

Use desired versus observed state.

Internals:

- `desired_revision` increments on every accepted mutating operation.
- the reconciler loop computes universe frames from current desired fixture/group/scene state
- the backend writes frames at a fixed cadence or on change
- `observed` is updated from backend write confirmation or backend readback when available

This avoids treating “tool returned success” as equivalent to “lights are definitely in that state.”

## Environment Variables

Core:

- `DMX_MCP_HOST=127.0.0.1`
- `DMX_MCP_PORT=3334`
- `DMX_BACKEND=simulator`
- `DMX_PATCH_PATH=./config/patch.json`

Safety:

- `DMX_OUTPUT_ARMED=false`
- `DMX_SAFE_MODE=true`
- `DMX_ALLOWED_UNIVERSES=1`
- `DMX_MAX_FPS=30`
- `DMX_BLACKOUT_ON_START=true`
- `DMX_BLACKOUT_ON_EXIT=true`
- `DMX_ALLOW_STROBE=false`

Simulator:

- `DMX_SIM_RECORD_PATH=./var/simulator-state.json`

OLA:

- `OLA_HOST=127.0.0.1`
- `OLA_PORT=9090`

sACN:

- `SACN_TARGET_HOST=192.168.1.50`
- `SACN_UNIVERSE=1`
- `SACN_PRIORITY=100`

Art-Net:

- `ARTNET_TARGET_HOST=192.168.1.60`
- `ARTNET_UNIVERSE=0`

## Strudelussy Integration Shape

MVP: no direct runtime coupling required.

The first working path is simply that an MCP-capable agent connects to both:

- Strudelussy MCP for project context
- `dmx-mcp` for lighting control

Later Strudelussy-side additions can include:

- persisted `lighting` metadata in `ProjectRecord` / `Project`
- MCP resources exposing derived lighting cues from sections/tracks
- a UI panel for patch, groups, and scenes
- a visualization mode selector that can switch the center viz panel between HAL and DMX/OLA views

Implemented now in this repo:

- persisted `lighting` metadata on the project shape
- section -> scene bindings driven from `// [section]` markers
- track -> group bindings driven from parsed named `$:` tracks
- `DMX Monitor` inside `ui/src/components/DawPanel.tsx`
- transport/editor active scene and active group indicators
- frontend DMX help/tutorial content
- onset-pulse track automation with binding-level `intensity`, `hold_ms`, and `fade_ms`
- DMX Monitor pulse presets and automation status readout

### Visualization swap requirement

The implementation must support replacing the current HAL visualization with a DMX/OLA visualization without redesigning the page shell.

Concrete repo impact:

- `ui/src/pages/HomePage.tsx` should stop mounting `HalVisualization` directly
- introduce a stable visualization wrapper component that decides which renderer to use
- `ui/src/components/StrudelEditor.tsx` should continue to expose `audioAnalyser` for HAL mode, but the visualization surface must also support a non-audio source
- the new DMX visualization should consume bridge state, not derive visuals from audio FFT data

Recommended initial visualization modes:

- `hal`
- `dmx`

Recommended DMX visualization MVP:

- 1D or grid rendering of universe channels 1..512
- fixture-group highlighting based on the patch file
- clear indicator of backend mode: `simulator`, `ola`, `sacn`, or `artnet`
- label whether the frame shown is `desired` or `observed`

Recommended later visualization upgrade:

- fixture-centric rendering instead of raw channel bars
- color preview for RGB/RGBW fixtures
- per-group intensity summary
- warning badges for blackout, disarmed output, and strobe-safe mode

Suggested future additions to Strudelussy project schema:

```ts
interface LightingProjectState {
  patch_id?: string
  cue_bindings?: Array<{
    section_label: string
    scene_id: string
  }>
  group_bindings?: Array<{
    track_name: string
    group_id: string
  }>
}
```

## Mapping Existing Strudelussy Abstractions

- `// [section]` markers map well to cues or scene triggers.
- Named `$:` tracks map well to fixture groups.
- Project versions map well to lighting snapshots or show-state checkpoints.

These mappings should also be usable inside the DMX visualization UI, for example showing which group or cue corresponds to the selected section/track.

Do not infer DMX channel layouts from Strudel code. Patch and fixture definitions must stay explicit.

## Phased Rollout

### Phase 0

- Write this spec and create the package skeleton.

### Phase 1

- Implement backend interface.
- Implement simulator backend.
- Implement resources and non-hardware-safe tools.
- Add deterministic tests.

### Phase 2

- Implement OLA backend.
- Verify against OLA Dummy.
- Add one-universe scene/group rendering.

### Phase 3

- Add Strudelussy-side optional lighting metadata and docs.
- Add simple cue/group mapping from sections/tracks.
- Add visualization abstraction in the UI so HAL and DMX renderers can be swapped.
- Add a basic `DmxVisualization` component that renders universe state from bridge resources.

Implemented subset now present:

- standalone bridge package scaffold and simulator backend
- OLA backend via JSON API
- local bridge HTTP status/control endpoints
- file-backed patch at `bridges/dmx-mcp/config/patch.json`
- scene apply and group state control
- DMX Monitor control surface in the Becomussy UI
- project-persisted lighting cue/group bindings
- transport/editor bound scene/group indicators
- non-simulator output gated by explicit arm state

### Phase 4

- Implement direct `sACN` backend.
- Validate with Ethernet DMX node.

### Phase 5

- Add `Art-Net` compatibility backend.
- Add multi-universe support.

## First Implementation Step

Create `bridges/dmx-mcp/` with:

- package scaffold
- MCP server bootstrap
- `DmxBackend` interface
- in-memory `simulator` backend
- `dmx://capabilities` and `dmx://universes/1/{desired,observed}` resources

That is the smallest step that locks the architecture in correctly.

First UI follow-up after that:

- replace the direct `HalVisualization` mount in `ui/src/pages/HomePage.tsx` with a `VisualizationSurface` wrapper that can later switch to a DMX/OLA renderer.
