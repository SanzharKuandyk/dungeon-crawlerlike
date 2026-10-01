# Verification · 2026-10-02

The conversion uses the original pinned dependencies. No package or lockfile upgrades.

## Automated checks

58 Vitest tests pass across game, server, client session, recovery and HTTP privacy checks.
Svelte/TypeScript report zero errors and warnings; Biome lint passes.
Production client/server builds pass. Phaser is loaded on demand; its 1.38 MB chunk still
produces Vite's size warning (about 360 KB compressed).

Four Playwright scenarios pass: independent controls for all ten developer characters;
automatic five-depth extraction after one Start; spirits/questions/equipment/scenario resets;
and separate host/projector/four-member/solo sessions with mobile reconnect and refresh.
The suite takes about 3.1 minutes, including 2.5 minutes of accelerated automatic play.
Screenshots were inspected at 360px phone width and 1366×768 desktop/projector size.
The phone has no horizontal overflow. The Phaser scene stays mounted, and the original
crew-colored vector models render correctly in both crew tiles and expanded encounters.

Recovery fixtures cover all 14 phases, stored question continuations, once-only resolution,
duplicate/changed-payload requests, stale input, latest-tab ownership, rejected targets,
host disconnection and save-failure rollback. Development HTTP refuses content files,
server source, Git internals and temporary notes. Runtime saves and test helpers are not public.

## Measured network simulations

Real Socket.IO clients, temporary atomic JSON saves, all five depths and 89 phases.
An injected server clock advances deadlines after submissions; these are accelerated
throughput checks, not 25-minute real-time classroom sessions. Both runs completed with
zero failed requests and identical final scores across clients. Bots used projected information.

| Measurement | 32 clients / 8 crews | 128 clients / 32 crews |
|---|---:|---:|
| Acknowledged requests | 1,090 | 4,354 |
| Run elapsed | 6.83 s | 188.86 s |
| Median acknowledgment | 55.59 ms | 1,929.45 ms |
| p95 acknowledgment | 175.00 ms | 6,790.74 ms |
| Maximum acknowledgment | 255.63 ms | 10,162.62 ms |
| Median save | 3.30 ms | 13.67 ms |
| p95 save | 14.34 ms | 148.36 ms |
| Maximum save | 50.26 ms | 223.18 ms |

There is no application crew cap. The 128-client run shows substantial queueing on this
laptop, so it is not a claim of smooth operation at that scale. Measurements used loopback
clients and ran alongside browser QA; real phones, Wi-Fi and tunnels can add latency.
The full local report is generated at ignored test-results/load-result.json.

## Preservation

Schema 4 / dungeon-v1 uses data/rules-v4. Older saves and the existing sibling backup remain
untouched. The pre-conversion Git baseline is recoverable from the ignored local bundle.
.Codex is temporary development planning only, excluded from Git and application output.
No course materials, other projects or Cloudflare configuration were modified.
