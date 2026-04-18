# DMX MCP Candidates

## Candidate Table

| candidate | type | open source? | active? | API surface | simulator/emulator capability | hardware path | MCP support exists? | ease of integration | key pros | key cons | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OLA | backend/service | Yes | Yes, repo active | Python API, CLI, web/JSON API, C++ API. <https://www.openlighting.org/ola/apis/> | Yes, Dummy plugin. <https://raw.githubusercontent.com/OpenLightingProject/ola/master/plugins/dummy/README.md> | Strong USB + Art-Net + sACN. <https://www.openlighting.org/ola/> | No public MCP support found | High | Linux-first, scriptable, simulation + hardware path, protocol conversion | Older release cadence, daemon/patch state to manage | Best first backend; use for dev and early hardware support |
| QLC+ | lighting console/app | Yes | Yes | Web interface, WebSocket API, plugins. <https://docs.qlcplus.org/v4/advanced/web-interface> | Partial: Loopback plugin, virtual routing, localhost Art-Net | Strong via plugins and OLA bridge | No public MCP support found | Medium | Great operator UI, real lighting workflows, Linux support | Heavier app model, more moving parts, less clean as a backend service | Strong optional companion, not primary bridge target |
| DMXControl 3 | lighting console/app | Partly open ecosystem, main app Windows-only | Yes | gRPC/protobuf network interface. <https://github.com/DMXControl/DMXControl3-Network-Interface> | Weak for Linux-first dev | Good on Windows-centric installs | No public MCP support found | Low | Interesting network interface story | Windows-only main app, poor Linux fit | Reject for Shoedelussy-first path |
| PyArtNet | protocol library | Yes | Yes | Python asyncio API. <https://pyartnet.readthedocs.io/en/latest/> | Protocol-level only | Good for Art-Net, sACN, KiNet nodes | No | Medium | Lightweight, scriptable, easy tests | Not a full patch/simulator system | Useful building block, not primary recommendation |
| Python `sacn` | protocol library | Yes | Stable/inactive | Python send/receive API. <https://github.com/Hundemeier/sacn> | Protocol-level only | Good for sACN | No | Medium | Focused and simple for E1.31 | Marked inactive/stable, not full controller | Useful test/building block |
| `node-dmx/dmx` | Node DMX library | Yes | Moderate | Node API. <https://github.com/node-dmx/dmx> | Minimal | Limited hardware/protocol adapters | No | Medium | Small and easy to wrap | Narrower ecosystem than OLA | Possible fallback for tiny POC, not preferred |
| `artnet` npm | Node protocol library | Yes | Moderate | Node API. <https://www.npmjs.com/package/artnet> | Protocol-level only | Art-Net only | No | Medium | Small, direct protocol output | No patch model or simulator story | Candidate for later direct Art-Net sink |
| `dmxnet` | Node protocol library | Yes | Moderate | Node API. <https://www.npmjs.com/package/dmxnet> | Protocol-level only | Art-Net / sACN oriented networking | No | Medium | Useful direct-network output library | Not a full DMX backend | Candidate for later direct network sink |
| BlenderDMX | visualizer | Yes | Yes | Blender add-on surface. <https://github.com/open-stage/blender-dmx> | Yes, visual simulation | Indirect via network DMX workflows | No | Low | Great human-visible visualization | GUI-heavy, not headless-first, not ideal core backend | Use only as optional preview layer |
| OLA Dummy plugin | simulator backend | Yes | Yes | Exposed through OLA | Yes | Via OLA migration path | No | High | Best deterministic dev backend, zero hardware | No rich visualization by itself | Best dev simulator/emulator candidate |
| QLC+ Loopback | simulator/virtual routing | Yes | Yes | Exposed through QLC+ | Yes | Through QLC+ plugins and OLA | No | Medium | Good for app-centric virtual routing | Requires QLC+ app model | Runner-up simulator path |
| Direct `sACN` output | protocol sink | Standard/protocol | Yes | UDP protocol, libs or custom sink | No native simulator by itself | Best path to Ethernet DMX nodes | No | Medium | Clean production boundary, common modern workflow | Needs your own output/sink implementation | Best long-term production sink |
| Direct Art-Net output | protocol sink | Standard/protocol | Yes | UDP protocol, libs or custom sink | No native simulator by itself | Strong compatibility path | No | Medium | Common field compatibility | Broadcast/unicast quirks, older assumptions | Good compatibility fallback |

## Notes

- No credible public MCP-native DMX backend was found during research.
- The practical choice is not “which DMX tool already has MCP” but “which DMX backend is best to wrap with a small MCP bridge.”
- OLA scored best as the first backend to wrap.
- Direct `sACN` scored best as the long-term production sink once the bridge abstraction exists.
