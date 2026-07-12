# LODESTAR

**Mining Command Intelligence for *Elite Dangerous*.**
*"lode" = ore vein; "lodestar" = guiding star.*

LODESTAR does all the *thinking* of a mining operation — finding the richest hotspots, pricing the galaxy, planning the run, judging every prospected rock in real time — and coaches the Commander through the flying. It gets as close to an autonomous mining operation as is possible **without ever crossing Frontier's Terms of Service**: LODESTAR plans and coaches; the human and the game's own assist modules fly.

## Compliance stance (the Prime Directive)

- **Not a bot.** No autonomous flight, no synthetic input loops, no screen-reading that drives controls, no AFK anything. Ever.
- **Green Zone core:** read-only journal/status consumption + external APIs + analysis, scoring, planning, display.
- **Yellow Zone (guardrailed):** a single, discrete, player-commanded voice→keybind action; read-only overlay.
- **Red Zone: never built, under any framing.**
- **All AI/ML runs locally** on a dedicated GPU (RTX 3060, 12 GB). Zero cloud inference. The game renders on the RTX 5070 Ti.

See [`LODESTAR_SSOT.md`](./LODESTAR_SSOT.md) — the Single Source of Truth governing every phase, step, and constraint of this project.

## Monorepo map

| Path | Purpose |
| --- | --- |
| `apps/desktop` | Electron shell + React/Vite renderer (Command Deck UI) |
| `packages/core` | Journal watcher, event bus, domain models, SQLite, IPC bridge |
| `packages/intelligence` | Layer 1 — deterministic scoring, planning, market optimization |
| `packages/ai` | Layer 2 — local Ollama client, tool-calling orchestration |
| `packages/ml` | Layer 3 — local ML models + Bayesian yield calibration |
| `packages/data` | Hotspot dataset, schema, seeds, migrations |
| `packages/integrations` | EDSM / Spansh / Inara / EDDN / cAPI / Discord clients |
| `packages/voice` | Guardrailed STT (faster-whisper) + TTS (Piper) + keybind bridge |
| `packages/overlay` | Read-only in-game HUD windows |
| `packages/carrier` | Fleet-carrier state, Tritium math, expedition planner |
| `packages/wing` | Wing telemetry sharing (opt-in) |
| `packages/community` | Community hotspot contributions (opt-in) |
| `packages/shared` | Shared types, utilities, result/error primitives |
| `packages/compliance` | The compliance test suite — egress, guardrail, and red-team tests that gate every merge |
| `packages/scripts` | Repo tooling: banned-pattern / dependency-direction checkers, journal fixture scrubber |
| `services/` | Self-hostable wing relay + community endpoint, Python ML/STT sidecars |
| `resources/` | Static assets, voices, seed datasets |
| `docs/` | User + developer documentation |

## Status

Stage 1 complete (SSOT + scaffolding). Build begins at **Phase 0** per the SSOT. Nothing here is runnable yet by design — no placeholder implementations are ever committed.

## License

[AGPL-3.0-only](./LICENSE).
