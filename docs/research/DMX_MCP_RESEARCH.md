# DMX via MCP for Shoedelussy

Status: research + implementation planning package

## Executive Summary

Primary recommendation: build a thin standalone `dmx-mcp` bridge in this repo as a separate process, and keep Shoedelussy's existing Cloudflare Worker MCP server focused on project and lighting-intent state.

Recommended development backend: OLA with its Dummy plugin.

Recommended production backend: direct `sACN` output to an Ethernet DMX node, with an OLA backend also supported for Linux USB widgets and protocol conversion.

Smallest viable MVP: a local `bridges/dmx-mcp` package exposing a safe MCP server with `simulator` and `ola` backends, high-level fixture/group tools, explicit arm/blackout controls, and deterministic state resources.

UI requirement: the spec must also preserve a clean path to replace the current HAL visualization with an OLA/DMX-backed visualization in the same center-panel slot.

Why: this keeps hardware and timing-sensitive code out of Shoedelussy's Worker runtime, avoids patching large DMX applications, gives a simulator-first workflow, and preserves a clean path to real hardware.

## Repo Context

Relevant Shoedelussy architecture observed in this repo:

- The backend is a Cloudflare Workers + Hono app in `server/`; the main entrypoint is `server/src/index.ts`.
- Shoedelussy already exposes an inbound MCP server at `/mcp`, bootstrapped in `server/src/routes/mcp.ts` and documented in `docs/MCP.md`.
- Existing MCP tools live in `server/src/lib/mcp-tools/` and currently operate on KV-backed project/pattern state, not local hardware.
- Project persistence is a KV-backed `ProjectRecord` in `server/src/lib/projectStore.ts` and mirrored in the frontend `Project` type in `ui/src/types/project.ts`.
- Musical structure already has useful cue anchors:
  - section markers via `// [section]` comments parsed by `ui/src/lib/codeParser.ts`
  - named `$:` tracks parsed as `ParsedTrack`s by `ui/src/lib/codeParser.ts`
  - version snapshots already exist in project state
- The DAW UI boundary lives around `ui/src/pages/HomePage.tsx` and `ui/src/components/DawPanel.tsx`.

Implication: Shoedelussy already has a good place to store lighting intent and expose MCP-readable metadata, but the Worker runtime is the wrong place for direct DMX I/O, local UDP device ownership, or USB hardware control.

Additional UI implication: the current visualization is mounted directly as `HalVisualization` from `ui/src/pages/HomePage.tsx`, so the spec needs an explicit visualization abstraction if DMX/OLA state is going to replace HAL cleanly.

## Research Method

This package was produced with intentional parallel subagent research and a separate repo-inspection pass.

### Subagent A

Exact question: What are best practices for MCP when tools control external, stateful, timing-sensitive, or hardware-adjacent systems such as lighting/DMX?

Bottom line:

- Make tools declarative and high-level.
- Separate desired state from observed state.
- Require idempotency keys for mutating operations.
- Treat long-running effects as tracked operations.
- Expose state through MCP resources and subscriptions.
- Keep safety interlocks and dry-run/simulator modes explicit.

Key evidence:

- MCP tools spec: <https://modelcontextprotocol.io/specification/2025-03-26/server/tools>
- MCP lifecycle and cancellation: <https://modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle>
- MCP progress: <https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/progress>
- MCP resources: <https://modelcontextprotocol.io/specification/2025-03-26/server/resources>
- Stripe idempotency guidance: <https://docs.stripe.com/api/idempotent_requests>
- AWS IoT device shadow pattern: <https://docs.aws.amazon.com/iot/latest/developerguide/iot-device-shadows.html>

### Subagent B

Exact question: Survey the DMX ecosystem relevant to Linux-friendly automation and simulator-first development.

Bottom line:

- OLA is the strongest Linux-friendly automation backend.
- QLC+ is a strong operator-facing companion, but heavier than needed as the core bridge target.
- DMXControl 3 is less suitable for a Linux-first path.
- Protocol libraries are useful building blocks, not complete control systems.

Key evidence:

- OLA overview and APIs: <https://www.openlighting.org/ola/> and <https://www.openlighting.org/ola/apis/>
- OLA Dummy plugin: <https://raw.githubusercontent.com/OpenLightingProject/ola/master/plugins/dummy/README.md>
- QLC+ web interface and plugins: <https://docs.qlcplus.org/v4/advanced/web-interface> and <https://docs.qlcplus.org/v4/plugins/loopback>
- DMXControl 3 system requirements: <https://www.dmxcontrol.de/en/dmxcontrol-3/system-requirements.html>
- DMXControl 3 network interface: <https://github.com/DMXControl/DMXControl3-Network-Interface>

### Subagent C

Exact question: Search specifically for existing MCP + DMX integrations, MCP servers, bridges, plugins, experiments, or repositories.

Bottom line:

- No credible maintained MCP-native DMX control server was found.
- The closest false positive was `stage-lighting-mcp`, but it is for image-generation lighting vocabulary, not DMX transport.
- This space should be treated as greenfield.

Key evidence:

- MCP site: <https://modelcontextprotocol.io>
- `stage-lighting-mcp` README: <https://raw.githubusercontent.com/dmarsters/stage-lighting-mcp/main/README.md>
- OLA: <https://www.openlighting.org/ola/>
- QLC+: <https://www.qlcplus.org/>

### Subagent D

Exact question: Among existing DMX simulators/emulators/virtual backends, which is the best development backend candidate for a Shoedelussy + MCP integration?

Bottom line:

- OLA is the best primary development backend.
- QLC+ is the best runner-up when a visible operator console matters.
- Visualizers like BlenderDMX are useful downstream, not as the core backend.

Key evidence:

- OLA command-line/API docs: <https://www.openlighting.org/ola/getting-started/command-line-tools/>
- OLA JSON API notes: <https://wiki.openlighting.org/index.php/OLA_JSON_API>
- QLC+ web interface: <https://www.qlcplus.org/docs/html_en_EN/webinterface.html>
- BlenderDMX: <https://github.com/open-stage/blender-dmx>

### Subagent E

Exact question: What is the best production-ready path from Shoedelussy to real DMX hardware, while preserving a simulator-first development story?

Bottom line:

- Long-term production should target a protocol backend, with `sACN` as the preferred production sink.
- `Art-Net` should be supported as a compatibility mode.
- OLA is the best Linux edge bridge for USB widgets and protocol conversion.

Key evidence:

- Art-Net intro: <https://art-net.org.uk/art-net-introduction-and-terminology/>
- Open Lighting E1.31/sACN notes: <https://wiki.openlighting.org/index.php/E1.31>
- OLA hardware/protocol support: <https://www.openlighting.org/ola/>
- QLC+ compatibility: <https://www.qlcplus.org/discover/compatibility>

### Subagent F

Exact question: Inspect the Shoedelussy repository and determine the best integration shape for DMX via MCP.

Bottom line:

- Shoedelussy should remain primarily an MCP server, not become an MCP client for MVP.
- Lighting intent should live in Shoedelussy project state and MCP tools/resources.
- Actual DMX transport should live in a separate hardware-local bridge process.

Relevant repo evidence:

- `server/src/index.ts`
- `server/src/routes/mcp.ts`
- `server/src/lib/mcp-tools/`
- `server/src/lib/projectStore.ts`
- `ui/src/types/project.ts`
- `ui/src/lib/codeParser.ts`

### Subagent G

Exact question: Is it better to add MCP support into an existing DMX tool, or build a thin standalone MCP-to-DMX bridge around existing APIs/protocols/backends?

Bottom line:

- The thin standalone bridge pattern scored highest.
- Embedding DMX transport directly into Shoedelussy is a runtime mismatch.
- Patching OLA or QLC+ to add MCP is higher maintenance and lower leverage.

## Candidate Survey

The main software candidates considered were:

- OLA
- QLC+
- DMXControl 3
- PyArtNet
- Python `sacn`
- `node-dmx/dmx`
- `artnet` npm
- `dmxnet`
- BlenderDMX

Detailed table: `docs/research/DMX_MCP_CANDIDATES.md`.

## Existing MCP + DMX Support

Finding: no credible public MCP-native DMX control server appears to exist today.

Implications:

- Do not plan around discovering a ready-made MCP-native lighting stack.
- The implementation should assume Shoedelussy is entering a greenfield integration space.
- The design should keep the owned code small and layered over proven DMX infrastructure.

## Best Practices for MCP with Stateful/Hardware Systems

Recommended MCP design rules for DMX:

1. Use high-level tools as the primary interface.
2. Expose raw channel writes only as explicitly unsafe/debug operations.
3. Make timing explicit in schemas: `fade_ms`, `start_at`, `hold_ms`, `max_rate_hz`.
4. Separate desired state from observed state.
5. Return operation receipts, not vague success strings.
6. Require idempotency keys for writes.
7. Expose patch, output, safety, and operation state as MCP resources.
8. Provide a simulator backend with the exact same tool contract.
9. Require explicit arm/enable for non-simulated output.
10. Define compensation as “restore a known safe scene/snapshot”, not magical undo.

Recommended MCP tool shape:

- `arm_output`
- `disarm_output`
- `apply_scene`
- `set_fixture_state`
- `set_group_state`
- `blackout`
- `stop_operation`
- `list_fixtures`
- `list_groups`
- `list_scenes`

Recommended MCP resources:

- `dmx://capabilities`
- `dmx://backends/current`
- `dmx://safety/interlocks`
- `dmx://patch`
- `dmx://universes/{id}/desired`
- `dmx://universes/{id}/observed`
- `dmx://operations/{id}`

## Architecture Options

Four serious architecture options were compared.

### Option 1: Embed DMX-facing MCP directly into Shoedelussy

Shape:

- Add DMX transport logic into Shoedelussy's existing `server/` MCP server.

Pros:

- Reuses the existing MCP route and auth model.
- Centralizes more state in one app.

Cons:

- Poor runtime fit: `server/` is Cloudflare Workers + Hono, not a hardware-local process.
- Hard to own local UDP timing, `localhost` services, or USB hardware safely.
- Makes the music app responsible for hardware-adjacent concerns.

Verdict: reject.

### Option 2: Add MCP support into an existing DMX tool

Shape:

- Patch OLA or QLC+ to expose MCP directly.

Pros:

- Could leverage mature DMX internals.

Cons:

- Requires deep work in larger codebases.
- Inherits upstream release and maintenance burden.
- MCP becomes a bolt-on inside software that is not organized around MCP semantics.

Verdict: reject unless you want to become an upstream maintainer.

### Option 3: Thin standalone MCP-to-DMX bridge

Shape:

- Add a new in-repo package such as `bridges/dmx-mcp/`.
- It runs locally near simulators or hardware.
- It exposes safe MCP tools and uses backend adapters (`simulator`, `ola`, later `sacn`, `artnet`).

Pros:

- Clean simulator-first path.
- Clear hardware boundary.
- Best fit with MCP's multi-server model.
- Best fit with Shoedelussy's current architecture.
- Smallest owned surface area.

Cons:

- Adds another process to run.
- Needs explicit config and ops discipline.

Verdict: primary recommendation.

### Option 4: Simulator-only tooling

Shape:

- Build only against a simulator and worry about hardware later.

Pros:

- Very fast first demo.

Cons:

- Encourages dead-end abstractions.
- Fails the production-readiness requirement.

Verdict: use only as a backend mode, not the whole architecture.

## Weighted Comparison

Scoring scale: 1 to 5. Higher is better.

Weights:

- open source and modifiable: 8
- active maintenance / upgrade risk: 8
- ease of automation: 12
- API quality: 10
- simulator/emulator support: 10
- path to real hardware: 12
- ease of local development: 8
- Linux workflow fit: 8
- low operational complexity: 8
- clean fit with MCP: 6
- clean fit with Shoedelussy: 5
- safety and testability: 5

### Architecture Scores

| Architecture | Weighted score | Summary |
|---|---:|---|
| Thin standalone MCP-to-DMX bridge | 4.52 / 5 | Best separation of concerns, best simulator-to-hardware path |
| Simulator-only tooling | 3.74 / 5 | Good dev ergonomics, weak production path |
| Add MCP into existing DMX tool | 2.78 / 5 | Too much upstream complexity for too little benefit |
| Embed DMX directly in Shoedelussy Worker | 2.31 / 5 | Wrong runtime and higher risk |

### Backend Scores

| Backend / target | Weighted score | Summary |
|---|---:|---|
| OLA | 4.28 / 5 | Best first backend to implement and best dev backend |
| sACN direct output | 4.19 / 5 | Best clean long-term production sink |
| QLC+ | 3.54 / 5 | Strong optional companion, not ideal primary bridge target |
| Art-Net direct output | 3.42 / 5 | Good compatibility fallback |
| DMXControl 3 | 2.11 / 5 | Poor Linux fit |

Mixed evidence note: OLA is the best first backend to implement because it spans simulation and Linux hardware well, but direct `sACN` is the cleanest long-term production output target when the deployment can use Ethernet DMX nodes.

## Recommended Architecture

Pick exactly one primary recommendation:

### Recommended architecture

Use an external standalone MCP server that bridges Shoedelussy to DMX backends.

Concrete shape:

- Shoedelussy remains its own MCP server for project and lighting-intent state.
- A new local `dmx-mcp` bridge is added in this repo as a separate package and separate runtime.
- Agents that need both composition context and lighting control connect to both MCP servers.
- The bridge owns backend selection, timing, reconciliation, simulator mode, and hardware safety.

Why this is the best fit:

- It respects Shoedelussy's current runtime boundaries.
- It keeps hardware-specific logic out of the Worker.
- It preserves a simulator-first workflow.
- It allows development against OLA Dummy now and real hardware later.
- It makes the DMX control surface small, deterministic, and testable.

### Why this is better than the alternatives

Against embedding MCP directly into Shoedelussy for DMX:

- Shoedelussy's current server is a Cloudflare Worker, which is not a good hardware-local runtime.
- A Worker should not be the system of record for low-latency device output.

Against adding MCP support into an existing DMX tool:

- OLA and QLC+ are valuable backends, but patching them creates more maintenance than value.
- A standalone bridge lets Shoedelussy own MCP semantics without owning their internals.

Against writing to simulator-only tooling that does not scale to hardware:

- Simulator-only designs make it too easy to bake in assumptions that collapse in production.
- The backend contract must be hardware-capable from day one, even if MVP runs in simulation.

## Recommended Development Backend

Best emulator/simulator candidate: OLA with the Dummy plugin.

Why:

- Linux-friendly and headless.
- Real automation surfaces: Python, CLI, web/JSON API.
- Official dummy/test backend.
- Clean upgrade path to OLA-managed USB or protocol output later.

Optional visual QA path:

- Feed a visualizer or QLC+ downstream over Art-Net or sACN for human preview, but do not make that tool the core backend.
- In Shoedelussy itself, make the center visualization slot capable of rendering DMX universe state so the current HAL panel can be replaced instead of only supplemented.

## Recommended Production Backend

Best real-hardware path: direct `sACN` output from the bridge to a dedicated Ethernet DMX node.

Why:

- Cleaner long-term boundary than depending on a daemon-specific patch model.
- Common production-friendly network workflow.
- Easier to reason about operationally than layering every deployment through a full console app.

Important implementation nuance:

- The first production-capable backend you implement should still be OLA, because it is the lowest-risk way to get dev simulation plus Linux hardware support quickly.
- After that, add a direct `sACN` backend as the preferred production sink.

## Recommended Dev Architecture

Development setup:

1. Run Shoedelussy as it exists today.
2. Run `bridges/dmx-mcp` locally.
3. Configure `DMX_BACKEND=simulator` or `DMX_BACKEND=ola` with OLA Dummy.
4. Use MCP tools to target named fixtures/groups/scenes.
5. Observe `dmx://...` resources or an optional visualizer.

Key rule: the same MCP tool contract must work in both simulator and production modes.

## Recommended Production Architecture

Production setup:

1. Shoedelussy remains the composition/project MCP server.
2. A local or edge-hosted `dmx-mcp` bridge runs on the lighting machine or trusted LAN.
3. The bridge loads a patch file and fixture/group definitions.
4. The bridge outputs to `sACN` by default.
5. OLA remains available as a backend when USB DMX widgets or protocol translation are needed.

## MVP

Smallest technically sound, low-risk MVP:

1. Create `bridges/dmx-mcp/` as a Node/TypeScript package.
2. Implement backends:
   - `simulator`
   - `ola`
3. Implement only safe, high-level MCP tools:
   - `arm_output`
   - `disarm_output`
   - `apply_scene`
   - `set_group_state`
   - `blackout`
   - `list_fixtures`
   - `list_groups`
4. Implement resources:
   - `dmx://capabilities`
   - `dmx://patch`
   - `dmx://backends/current`
   - `dmx://universes/1/desired`
   - `dmx://universes/1/observed`
5. Support only one universe in MVP.
6. Keep raw channel write tools disabled by default.

This proves:

- MCP semantics are sound.
- Simulator and OLA paths share one control contract.
- Safety interlocks and operation tracking work.

## Major Pitfalls

### Timing

- Do not make the LLM responsible for frame cadence.
- The bridge must own rate limiting and frame coalescing.
- Use explicit transition parameters, not prompt prose.

### Rate limiting

- Cap output FPS, for example 20 to 30 Hz for MVP.
- Coalesce rapid mutations into the latest desired frame.

### Channel safety

- Enforce universe allowlists and channel bounds.
- Clamp all values to `0..255`.
- Keep raw writes behind an admin/debug flag.

### Fixture modeling

- Primary interface should be fixture attributes and named groups, not raw channel indices.
- Start with a narrow fixture model for dimmer, RGB, RGBW, and strobe-capable fixtures.

### Scene abstraction

- Scenes should be explicit snapshots or parameterized looks, not hidden implicit state.
- Scene application must declare merge policy and fade duration.

### Universes

- MVP should support one universe only.
- Multi-universe support should be explicit in patch config and API signatures later.

### Strobe safety

- Treat strobe as a special-risk attribute.
- Require confirmation or an explicit `unsafe_allow_strobe` config in non-simulated mode.

### State drift

- DMX output intent is not fixture truth.
- Track `desired` and `observed` separately and expose both.

### Transport mismatch

- OLA, `sACN`, and `Art-Net` differ in topology and ops assumptions.
- Keep Shoedelussy and the MCP tool surface transport-agnostic.

### Testing

- Unit-test tool semantics against a fake backend.
- Integration-test against OLA Dummy.
- Add golden tests for scene-to-universe rendering.

### Rollback

- Do not promise automatic undo.
- Rollback means apply a known safe scene or restore a saved snapshot.

## Where This Fits in the Repo

Recommended new locations:

- `bridges/dmx-mcp/` for the standalone bridge package
- `docs/research/DMX_MCP_RESEARCH.md` for this report
- `docs/research/DMX_MCP_CANDIDATES.md` for candidate comparison
- `docs/specs/SPEC_DMX_MCP_INTEGRATION.md` for the implementation-ready spec
- `docs/specs/TASKS_DMX_MCP.md` for task breakdown
- `docs/specs/AGENT_PROMPT_DMX_MCP_IMPLEMENTATION.md` for the follow-up coding prompt

Recommended Shoedelussy-side future touchpoints:

- `server/src/lib/projectStore.ts` and `ui/src/types/project.ts` for optional persisted lighting metadata
- `server/src/lib/mcp-tools/` for optional lighting-intent tools/resources later
- `ui/src/lib/codeParser.ts` derived sections/tracks as initial cue/group seed data
- `ui/src/pages/HomePage.tsx` as the current visualization mount point to refactor behind a wrapper
- `ui/src/components/HalVisualization.tsx` as the current renderer to preserve behind an adapter during the swap

Implemented touchpoints now present:

- `bridges/dmx-mcp/` standalone bridge package
- `bridges/dmx-mcp/config/patch.json` file-backed patch model
- `ui/src/components/DmxControlPanel.tsx` for monitor/control
- `ui/src/components/visualization/` for HAL/DMX switching
- `ui/src/types/project.ts` and `server/src/lib/projectStore.ts` for persisted lighting bindings
- `ui/src/features/tutorial/tutorialData.ts` for DMX live help content

Audit note:

- the repo now enforces arm gating for non-simulator writes, but track-to-group automation still uses an early runtime onset-activity heuristic rather than a full event-derived lighting model.

## Final Recommendation

### Recommended architecture

Use an external standalone MCP-to-DMX bridge as a separate local package/runtime.

### Why this is better than the alternatives

- Better than embedding DMX in Shoedelussy: avoids the Worker runtime mismatch.
- Better than patching OLA or QLC+: smaller owned surface and lower maintenance.
- Better than simulator-only tooling: one contract scales from dev to hardware.

### Recommended development backend

OLA with the Dummy plugin.

### Recommended production backend

Direct `sACN` output to an Ethernet DMX node.

### MVP

Standalone `bridges/dmx-mcp` package with `simulator` and `ola` backends, one universe, safe high-level tools, and explicit safety resources.

UI companion requirement for MVP planning: stop hard-wiring HAL as the only visualization implementation by introducing a stable visualization wrapper in the UI.

### Next implementation step

Create `bridges/dmx-mcp/` with a minimal MCP server skeleton, backend interface, and a deterministic `simulator` backend that records desired and observed universe state.

Immediate next UI step after that: replace the direct `HalVisualization` mount with a swappable visualization surface so an OLA/DMX visualization can take over the same slot.
