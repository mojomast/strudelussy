# Tasks: DMX MCP

## Phase 0: Scaffold

- Create `bridges/dmx-mcp/` package with TypeScript, test runner, and MCP SDK dependency.
- Add `src/index.ts` and `src/server.ts` to bootstrap the MCP server.
- Add `src/backends/types.ts` with the `DmxBackend` interface.
- Add `src/config.ts` to parse environment variables.
- Add `src/tests/` and a basic smoke test for server boot.

## Phase 1: Simulator-first MVP

- Implement `src/backends/simulator.ts` with in-memory universe frames.
- Record both desired and observed universe state in simulator mode.
- Implement `dmx://capabilities` resource.
- Implement `dmx://backends/current` resource.
- Implement `dmx://universes/1/desired` resource.
- Implement `dmx://universes/1/observed` resource.
- Implement `arm_output` tool.
- Implement `disarm_output` tool.
- Implement `blackout` tool.
- Implement idempotency-key handling for mutating tools.
- Implement global frame rate limiting and coalescing.
- Add tests for arm/disarm behavior.
- Add tests for idempotent retry behavior.
- Add tests for blackout priority.

## Phase 1.5: Visualization seam in Strudelussy UI

- Add `ui/src/components/visualization/types.ts` for visualization mode and payload types.
- Add `ui/src/components/visualization/VisualizationSurface.tsx` as the new stable viz entrypoint.
- Add `ui/src/components/visualization/HalVisualizationAdapter.tsx` that wraps the current `HalVisualization` path.
- Update `ui/src/pages/HomePage.tsx` to mount `VisualizationSurface` instead of `HalVisualization` directly.
- Preserve current HAL behavior as the default visualization mode.
- Ensure the visualization surface accepts both audio-analyser-backed and DMX-state-backed renderers.

## Phase 2: Patch, fixtures, groups, scenes

- Define patch file schema in `src/fixtures/model.ts`.
- Add patch loader and validation in `src/patch.ts`.
- Implement `dmx://patch` resource.
- Implement fixture profile rendering for dimmer fixtures.
- Implement fixture profile rendering for RGB fixtures.
- Implement fixture profile rendering for RGBW fixtures.
- Implement group resolution logic.
- Implement `list_fixtures` tool.
- Implement `list_groups` tool.
- Implement `list_scenes` tool.
- Implement `apply_scene` tool.
- Implement `set_group_state` tool.
- Add golden tests for scene-to-frame rendering.
- Define a visualization payload shape derived from patch plus universe state.

## Phase 3: OLA backend

- Decide OLA integration method for MVP: JSON API versus local process wrapper.
- Implement `src/backends/ola.ts`.
- Add backend initialization and connectivity checks.
- Add integration test setup instructions for OLA Dummy.
- Add tests that verify one-universe writes against OLA Dummy behavior.
- Document local dev setup with OLA Dummy.
- Add a basic `DmxVisualization` component that renders OLA/bridge state instead of audio FFT data.
- Wire visualization mode switching so HAL can be replaced with DMX view in the center panel.

## Phase 4: Safety hardening

- Add strobe safety gate and config flag.
- Add universe allowlist enforcement.
- Add channel bounds validation.
- Add `DMX_BLACKOUT_ON_START` behavior.
- Add `DMX_BLACKOUT_ON_EXIT` behavior.
- Add operation receipts with revision numbers.
- Add `dmx://safety/interlocks` resource.
- Add `dmx://operations/{id}` resource.

## Phase 5: Strudelussy-side metadata

- Extend `server/src/lib/projectStore.ts` with optional persisted lighting metadata.
- Extend `ui/src/types/project.ts` with matching lighting types.
- Add migration-safe defaults in UI store and API serialization paths.
- Add a docs-only or hidden UI panel for lighting metadata inspection.
- Add helper logic to derive cue candidates from `// [section]` markers.
- Add helper logic to derive group candidates from named `$:` tracks.
- Add section/group overlays or labels inside the DMX visualization where useful.

Implemented now:

- persisted `lighting` metadata in project types and server persistence
- DMX Monitor sidebar panel
- section -> scene binding UI
- track -> group binding UI
- transport/editor active scene/group indicators
- RGBW group controls in the DMX panel
- binding-level `intensity`, `hold_ms`, and `fade_ms`
- pulse presets in the DMX panel
- automation status readout for currently pulsing groups

## Phase 5.5: DMX Help

- Add DMX-specific tutorial/live help content to the Learn panel.
- Add DMX usage guidance to keyboard/help overlay text.
- Document simulator mode, OLA mode, patch files, bindings, and safe controls in the repo docs.

## Phase 6: Production sinks

- Implement direct `sACN` backend in `src/backends/sacn.ts`.
- Test with a dedicated Ethernet DMX node.
- Add `Art-Net` backend in `src/backends/artnet.ts`.
- Add backend selection docs and ops runbooks.

## Phase 7: Operational quality

- Add structured logging for operation lifecycle and backend writes.
- Add dry-run mode coverage for all mutating tools.
- Add failure-injection tests for backend disconnects.
- Add snapshot restore / safe-scene compensation behavior.
- Add a CI path that runs simulator tests and skips hardware-dependent tests.

## Recommended Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7

## First Task

- Create `bridges/dmx-mcp/` and implement the in-memory simulator backend plus the first three resources.
- Immediately after that, add `VisualizationSurface` so HAL is no longer hard-wired as the only visualization implementation.
