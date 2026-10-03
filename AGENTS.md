# Dungeon Crawlerlike

Use npm and the pinned lockfile. Keep one package; no dependency upgrades without a request.

## Boundaries

- `shared`: domain types, protocol, public projections, Zod inputs, palette.
- `game`: deterministic rules; no clocks, UUID generation, sockets, files, or Math.random.
- `server`: sessions, receipts, per-room mutation queue, storage, crew clocks, shared questions.
- `client`: scoped PlayerController input, Svelte views, notifications, timeline presentation.
- `client/arena`: persistent Phaser renderer only; never advance authoritative phases.

## Current rules

New matches are schema 7 / dungeon-v2 / data/rules-v7. One finite ten-room chapter. Crews of
1–4 advance independently; members share their crew's fight. No fixed crew limit. Symbols
are unique; colors may repeat. Frozen starting power/classes never rescale on death or loss
of connection. Only secured treasure scores; surviving crews auto-bank after room ten.

Confirmations lock a crew once all living members are ready. Editing withdraws readiness.
Optional fallback: 60 seconds; absent-member grace: 15 seconds; all-offline crews suspend.
Spirits can aid their own crew without blocking readiness. Combat reveals take 6.8s (8s for major outcomes) and seek
server time; health/score changes must not appear before impact, including reduced motion.
Use the same mounted renderer for player, host tile, and detail views.

Questions follow actual discoveries and wait for safe decision boundaries. At most three per
expedition; none after final extraction. All registered students answer, including spirits.
Solutions remain private until lock. Restore each crew's saved choices after the intermission.
Equipment charges spend only on an effect; rewards activate at the next combat decision.
Pacts are private until lock: Study correct = one charge; Blood costs P health, grants one
charge, two if correct. Reject Blood when HP <= P or dead. Missing answers have no reward.

PvP is a consent-based three-exchange prototype. Authoritative Duel records save both crew
continuations. Same battle/elite node, both strict-majority consent; any member may decline.
Thirty-second offers, once per pair, two offers per crew, two-room immunity after completion.
Require half health per living fighter at entry. Stake up to three carried treasure each. Strike/Guard/Feint use frozen power. No PvP deaths,
class skills, equipment use, or secured-score theft. Shared questions wait for duels to end.
Do not route PvP input through ordinary hero actions or advance two duels for one crew.
Normal movement broadcasts include a compact public position stream without private inputs.
Art is original code/vector geometry. Do not use copied commercial-game assets.

## Network invariants

Ready means authenticated plus synchronized. Do not buffer offline actions. Check ownership,
phase, deadline, class and targets. Same request ID means same payload; receipts are durable
before acknowledgment. A phase resolves once. Grouped saves preserve serial mutation order.
A delivery failure cannot roll back committed state. Old tabs require explicit takeover.
Public snapshots never include private answers, unrevealed choices, tokens, or debug controls.

Explicit End revokes mutation sessions; results remain public. Host absence gets a 90-second
grace, then a recoverable pause. Restart preserves session hashes/receipts and restores live
rooms paused at savedAt; no offline time consumption or replay. Explicit Resume is required.
Pause reasons compose across global pause, crew pause, offline crews and shared questions.
Room creation is one click with no installation key, including through tunnels. Existing host
authority remains session-token protected. The private host key authorizes lost-device host recovery only. Student recovery codes
are hashed, expire after five minutes and atomically rotate player tokens. Never persist the
plaintext code in receipt fingerprints. Read-only tabs cannot keep a player present.
Host moderation validates target crew phase/duel exchange, logs once, and saves before ACK.
Test stepping/speed uses test:control, never production host:control. Respect per-identity
limits and the 512 pending queue cap. Preserve older save directories.
Test rooms are in memory; no test endpoints on normal startup or non-loopback binds.

## Work and verification

Keep focused functions and explicit unions. Separate imports from implementation. Comments
explain surprising intent in one sentence. Avoid a generic combat engine or singleton player
socket. Neutral white surfaces, restrained team colors, 44px targets, dark primary hover.

Commands: npm run dev; npm.cmd run dev -- --test; npm.cmd run dev -- --test --port 3001;
npm run format; npm run lint; npm run check; npm test; npm run build; npm.cmd start -- --test;
npm run test:e2e; npm run test:load.

Temporary planning belongs only in ignored .Codex. Never import it or include it in builds.
Verification artifacts belong in ignored test-results. Do not touch course materials, other
projects, old backups, or hosting configuration. Record measured results in docs/verification.md.
