# Sector Siege · Dungeon Expedition

Use npm and the pinned lockfile. Keep one package; no dependency upgrades unless requested.

## Boundaries

- src/shared: domain types, protocol, Zod validation, public views, palette.
- src/game: deterministic functions. No clocks, UUIDs, sockets, files, or Math.random.
- src/server: sessions, receipts, ownership, deadlines, phases, queues, atomic saves.
- src/client: scoped PlayerController input, Svelte views, notifications and event presentation.
- src/client/arena: Phaser presentation only. Never decide outcomes or advance phases.

## Rules and invariants

One hero per student; crews of 1–4, no fixed crew limit. Unique crew symbols; palette colors
may repeat. Classes/power freeze at start. Death is permanent; spirits Ward. Heroes choose
personal combat actions; crews vote for routes, camp and withdrawal. Damage is simultaneous.
Weak-point breaks disable modifiers before enemy attacks. Only secured treasure scores;
eliminated crews retain secured treasure and ties share victory.

Questions follow events once per depth at depths 1–4. Every registered member answers,
including spirits. Solutions stay private until lock. Equipment earns no score; charges
consume only on effective use. New rewards activate at the next combat choice.

Ready means authenticated plus synchronized. Never buffer offline actions. Validate match,
phase, deadline, ownership, class and targets. Receipts are durable; IDs cannot change payload.
Resolve each phase once inside the room queue. Latest tab owns input; older tabs are read-only.
Disconnects preserve accepted inputs and never resize enemies/heroes. Public projections
exclude individual answers, unrevealed inputs, credentials and debug data.

New saves: schema 4 / dungeon-v1 / data/rules-v4. Never reinterpret older saves, modify course
materials, configure Cloudflare, or log tokens/answers. Restart active matches paused; failed
saves pause only their room. Test matches stay in memory. Test endpoints are absent in normal
mode and reject non-loopback binding. Developer identities each have separate sessions/storage.

## Work and checks

Keep focused functions/components and explicit unions; no generic combat engine, message bus
or singleton player input. Comments explain surprising rules in one short sentence.
Neutral surfaces, team-colored characters plus symbols, 44px targets, dark primary hover.
Reveals use presented state at server time; reduced motion must not reveal final outcomes early.

Commands: npm run dev; npm.cmd run dev -- --test; npm.cmd run dev -- --test --port 3001;
npm run format; npm run lint; npm run check; npm test; npm run build; npm.cmd start -- --test;
npm run test:e2e; npm run test:load.

Temporary planning belongs in ignored .Codex. It must never become a runtime/build dependency,
public file, or Git-tracked source. Verification artifacts belong in ignored test-results.
