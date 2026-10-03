# Verification · 2026-10-03

## Reliable connections and host moderation

New rooms use schema 7, dungeon-v2, and data/rules-v7. Older directories remain untouched.
Existing gameplay, original art, pinned dependencies, and independent crew progress remain.
Host absence allows 90 seconds of continued play, then preserves the expedition paused.
Restarts restore clocks at savedAt, retain identities/receipts/continuations, and require
explicit Resume. Global, crew, offline, and shared-question blockers compose.

Host session tokens protect existing rooms; the private key protects host recovery. Creation
is now one click, including through tunnels, per the simplified-hosting request. Replacement-device
codes expire after five minutes and rotate student authority without changing their hero.
Saves and receipt fingerprints contain code hashes only. Public snapshots exclude credentials.
Read-only tabs do not count as controlling presence. Request limits and a 512-command queue
bound incoming work without a crew cap or class-wide IP throttle.

Host controls cover crew pause/resume, timed extension, missing-choice defaults, new-PvP
policy, pre-settlement duel cancellation, and unlocked question skipping. Each durable
intervention appears once in the public log. Test stepping uses a separate test-only event.

## Automated checks

- Biome lint passes; TypeScript and Svelte checks report zero errors/warnings.
- 132 Vitest tests pass across 17 files. Coverage includes nested clocks, 90-second grace,
  all-phase restart, restore save failure, authority, receipts, throttling, queue overflow,
  private recovery, token rotation, duel refunds, and question skipping without pact costs.
- Production client/server build passes. The lazy Phaser chunk remains about 1.38 MB
  (361 KB gzip), producing the existing Vite size warning.
- All 18 Playwright scenarios passed after the simplified-hosting correction, including
  one-click creation, student code entry, host recovery, and responsive home layouts.

Browser coverage includes separate host/student/projector contexts, refresh and takeover,
private replacement-device recovery, host reclaim with explicit resume, crew-only pauses,
duel cancellation, and the existing automatic expedition/question/equipment/spirit flows.
Layout coverage includes 360px phones, landscape phones, tablets, and 1366×768 desktop.
The host crew menu now scrolls within the screen and leaves room beside its label.
The home screen separates hosting and joining into aligned cards, with equal spacing and
collapsed recovery. Hosting requires no installation key; the server still limits room
creation to five per minute, deduplicates retries, and protects existing rooms with tokens.
Tests simulate tunnel headers during creation and reject unauthorized host recovery.

## Measured network simulations

Real Socket.IO clients, temporary persisted rooms, atomic writes, and injected clock progress.
Every student reconnects once mid-expedition. ACK delivery includes a 20ms client-side delay.
Measurements are local Windows loopback, not school Wi-Fi or tunnel capacity claims.

| Metric | 32 clients / 8 crews | 128 clients / 32 crews |
|---|---:|---:|
| Gameplay elapsed | 6.51 s | 32.75 s |
| Reconnected identities | 32 | 128 |
| Acknowledged mutations | 1,026 | 4,098 |
| Failed/rejected requests | 0 | 0 |
| ACK median | 68.98 ms | 423.02 ms |
| ACK p95 | 98.91 ms | 829.80 ms |
| ACK maximum | 106.05 ms | 927.46 ms |
| Save median | 2.05 ms | 1.45 ms |
| Save p95 | 6.02 ms | 19.11 ms |
| Save maximum | 33.11 ms | 202.29 ms |
| Extracted crews | 8 | 32 |
| Deepest room | 10 | 10 |
| Consistent final scores | Yes | Yes |

All crews secured 59 treasure in each run. These runs exercise legal expedition and question
traffic with reconnect bursts, not mass concurrent duels. Flood rejection, save failure,
moderation, and duel recovery have focused automated coverage. The load run preceded the
final presentation/capability and restore-failure fixes; those changes were verified separately.

## Remaining limits

No human classroom, school-network, or Cloudflare playtest has been performed. These local
accelerated measurements do not establish maximum supported capacity or gameplay balance.
The fifteen original course-practice questions still need instructor review for exact lecture
alignment. Temporary planning and raw measurements remain ignored, never imported by source.
