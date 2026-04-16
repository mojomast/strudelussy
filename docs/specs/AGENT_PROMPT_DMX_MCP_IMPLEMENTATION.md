# Agent Prompt: DMX MCP Implementation

You are implementing the chosen DMX-via-MCP architecture for Strudelussy.

## Goal

Create the first working version of a standalone DMX MCP bridge inside this repo.

## Architecture constraints

- Do not put DMX transport into `server/`; that runtime is Cloudflare Workers based.
- Create a new package at `bridges/dmx-mcp/`.
- This package must be a separate MCP server process.
- The bridge must support a deterministic `simulator` backend first.
- The code must be structured so `ola`, `sacn`, and `artnet` backends can be added later without changing the MCP contract.
- Do not leave HAL hard-wired as the only visualization path in the UI. The visualization layer must be swappable so a DMX/OLA renderer can replace HAL cleanly.

## Required first milestone

Implement:

- package scaffold for `bridges/dmx-mcp/`
- MCP server bootstrap
- backend interface
- in-memory simulator backend
- state store for desired and observed universe frames
- resources:
  - `dmx://capabilities`
  - `dmx://backends/current`
  - `dmx://universes/1/desired`
  - `dmx://universes/1/observed`
- tools:
  - `arm_output`
  - `disarm_output`
  - `blackout`
- idempotency key handling for mutating tools
- output safety defaults: start disarmed, one-universe allowlist, channel clamp, max FPS config
- tests for the simulator backend and tool semantics
- UI visualization seam:
  - add `ui/src/components/visualization/VisualizationSurface.tsx`
  - move the current HAL usage behind a wrapper adapter
  - update `ui/src/pages/HomePage.tsx` so the center viz panel can later switch from HAL to DMX

## Tool semantics

- Mutating tools must return structured JSON receipts inside MCP text content.
- `arm_output` must be required before non-simulated output would be allowed, but simulator mode may still record state while reporting arm status clearly.
- `blackout` must immediately zero the desired frame and update observed state in simulator mode.
- Reusing an idempotency key with different params must return an error.
- Reusing an idempotency key with the same params must return the original receipt.

## Design constraints

- Prefer high-level, deterministic behavior over feature breadth.
- Keep the initial fixture/scene model out of the first milestone if it slows down the skeleton.
- Preserve the existing page layout while making the visualization implementation replaceable.
- Use ASCII only.
- Add succinct comments only where needed.
- Use `apply_patch` for edits.

## Verification

Add and run tests for:

- simulator backend write/read behavior
- arm/disarm state transitions
- blackout behavior
- idempotency behavior
- resource reads returning expected JSON
- UI verification that `HomePage.tsx` uses the visualization wrapper instead of directly mounting `HalVisualization`

## Deliverable

Produce a clean first milestone in `bridges/dmx-mcp/` that locks in the architecture correctly and is ready for later OLA integration, and update the UI so HAL can be replaced by a DMX/OLA visualization without reworking the shell.
