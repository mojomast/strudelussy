# DMX in Strudelussy

## Overview

Strudelussy includes a development-first DMX control path built around a standalone bridge at `bridges/dmx-mcp/`.

Current supported backends:

- `simulator`
- `ola`

Current UI support:

- HAL/DMX visualization switching
- DMX Monitor sidebar panel
- scene triggering
- group intensity and RGBW control
- section -> scene bindings
- track -> group bindings
- active lighting status in transport/editor UI
- frontend DMX help in the Learn panel and help overlay

## Architecture

- Strudelussy stores musical and project-side lighting metadata.
- `bridges/dmx-mcp` owns DMX transport, patch loading, state, and control actions.
- Agents can use MCP tools against the bridge.
- The frontend talks to the bridge over local HTTP for live monitoring and control.

## Bridge

Path:

- `bridges/dmx-mcp/`

Start it with:

```bash
cd bridges/dmx-mcp
pnpm start
```

Use OLA with:

```bash
cd bridges/dmx-mcp
DMX_BACKEND=ola pnpm start
```

## Patch File

Default patch file:

- `bridges/dmx-mcp/config/patch.json`

Configure a different patch file with:

- `DMX_PATCH_PATH`

Patch model currently includes:

- one universe
- named fixtures
- named groups

## HTTP Endpoints

- `GET /health`
- `GET /state`
- `GET /patch`
- `GET /scenes`
- `POST /scenes/apply`
- `POST /control/arm`
- `POST /control/disarm`
- `POST /control/blackout`
- `POST /control/group`

## MCP Tools

- `list_scenes`
- `arm_output`
- `disarm_output`
- `blackout`
- `apply_scene`
- `set_group_state`

## UI

### DMX Monitor

Location:

- right sidebar -> `DMX Monitor`

Capabilities:

- bridge reachability and backend/patch status
- patch inspection
- scene trigger buttons
- arm/disarm/blackout controls
- group intensity control
- group RGBW control
- section -> scene bindings
- track -> group bindings

### Visualization

Switch the center visualization between:

- `HAL`
- `DMX`

The DMX mode renders bridge state instead of audio FFT data.

## Bindings

Bindings are persisted in project metadata under `lighting`.

### Section to Scene

- source: `// [section]` markers in code
- target: DMX scenes

### Track to Group

- source: named `$:` tracks
- target: DMX groups
- optional binding controls: `intensity` and `hold_ms`
- optional binding control: `fade_ms`

## Automatic Lighting Behavior

- when playback is active and the project has cue bindings, the active section can trigger its bound DMX scene
- when playback is active and the project has group bindings, runtime-queried named track activity can drive DMX group updates
- track->group automation is currently onset-pulse based: it sends an intensity bump and then auto-releases after the binding hold time
- fade-out behavior can be shaped with per-binding `fade_ms`

Current note: track binding execution now uses real runtime trigger events and source-location matching to named tracks, with per-binding `intensity` and `hold_ms`, but it is still an onset-driven mapping layer rather than a full event-to-light parameter system.

### Pulse Presets

The DMX Monitor includes compact presets for common pulse shapes:

- `Kick`
- `Snare`
- `Hat`
- `Pad`
- `Stab`

These presets write tuned `intensity`, `hold_ms`, and `fade_ms` values into the selected track binding.

### Automation Status

The DMX Monitor shows currently pulsing groups with:

- source track name
- intensity
- remaining hold time

## Safety

- output starts disarmed by default
- live non-simulator output is gated by explicit arming
- blackout is explicit and always available
- simulator mode is preferred for development
- raw unrestricted channel writes are not the primary UI surface

## Live Help

DMX help is available in:

- the Learn/Tutorial panel
- the keyboard/help overlay

Look for the `DMX & Lighting Control` tutorial chapter.

## Current Limitations

- no direct `sACN` backend yet
- no multi-universe support yet
- no fade-time binding editor yet
- runtime track activity still works best with explicit named tracks and currently maps onset activity rather than richer musical parameters
- automation currently releases intensity back to `0` after `hold_ms` and does not yet derive color/intensity from musical event payloads

## Next Steps

1. Add direct `sACN` backend.
2. Add multi-universe patch support.
3. Add fade/transition controls to bindings.
4. Improve runtime track activity detection with deeper Strudel event introspection.
