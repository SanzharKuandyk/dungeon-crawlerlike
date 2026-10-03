# Dungeon Crawlerlike · Dungeon Expedition

A competitive dungeon expedition for phone, tablet, and laptop. Each student controls one character. Crews contain 1–4 members; there is no hard-coded crew limit. Crews explore independently, and members fight together inside their own encounter. Most secured treasure wins.

## Run

From `C:\Projects\lectures\dungeon-crawlerlike`:

```powershell
npm ci
npm run dev
```

Open http://localhost:3000 and click **Host a match**. It creates your room immediately, with no key or account, including when opened through a tunnel. Invite players, then start after they choose crews and classes. The host can pause, resume, or end the session. **Invite** shows the QR/link; **Projector** opens the public board. Click a crew tile for its encounter. Map, Dungeon, and Log stay separate.

Production:

```powershell
npm run build
npm start
```

Use the pinned dependencies and Node 24 runtime. PowerShell users should use `npm.cmd` when passing arguments. For LAN access: `npm.cmd run dev -- --host 0.0.0.0`. An Invite join-base URL changes generated links only. This project does not configure tunnels.

## Play

One chapter has ten ascending room positions and connected route choices. The same seeded map gives crews the same opportunities. Battles, elites, caches, mysteries, camps, and a final guardian offer different risks. Surviving crews automatically secure their remaining treasure after room ten; there is no endless score farming. Finished crews wait for the remaining crews. Eliminated crews keep secured treasure; ties share the win.

Members confirm route votes, personal combat actions, camp votes, and equipment choices. All living members ready means immediate resolution. A member can edit before the crew locks; that removes their readiness. There is no speed score. The optional classroom fallback locks idle decisions after 60 seconds. An absent member receives a safe default after 15 seconds while teammates remain connected. A fully disconnected crew suspends at its next decision. Spirits can submit aid but never block living teammates from proceeding.

Attack the body to kill; attack the weak point to remove the announced modifier. Breaking a Sentinel seal on its heavy-strike turn interrupts that strike. Brace or Protect absorbs damage. Loot sacrifices damage for carried treasure; Devourers punish looters while their weak point survives. Mend, Hex, Pilfer, Skirmish, and Channel give classes distinct choices. Encounters last at most four turns. Withdrawal requires a living-member majority and preserves carried treasure, but gives no victory purse.

Crews start with equal total health and basic attack strength regardless of size. Power and class eligibility freeze at start. Healing, actual damage protection, and attacks earn participation toward victory purses. Loot alone does not. Surviving victors gain up to two mastery ranks and choose equipment after a victory: one charge normally, two after an elite or guardian. Ward blocks damage, Salve heals a wounded survivor, and Lantern reduces dangerous stress. Charges spend only when useful.

At camp, Secure banks carried treasure, Rest heals and calms the crew, or Bargain trades stress for damage next room. Six stress causes panic damage. Individual deaths are permanent: spirits may Ward living fighters in their own crew. Losing the last member discards carried treasure. An eliminated student can still answer shared questions; eliminating a crew early can leave that crew waiting, which remains a classroom playtest concern.

Actual weak-point breaks, victories, or treasure discoveries can reveal up to three shared inscriptions before final extraction. The class pauses at a safe decision boundary, after active reveals finish. Every student, including spirits, answers privately. Answers lock when everyone has answered or after 35 seconds. Solutions are never sent early. Choose an explicit pact before answering: Study gives one charge for a correct answer and has no health cost. Blood pays your displayed power in HP at answer lock, gives one charge regardless of correctness, and a second for a correct answer. Blood requires enough health to pay without dying. Missing answers cost nothing and earn nothing. Each living character chooses their own equipment. Crew correctness remains visible for learning, but does not override personal pacts. Saved crew choices resume afterward. Learning can be disabled in the lobby.

Combat uses one persistent Phaser renderer for player views, host tiles, and encounter details. Reveals lasting 6.8 seconds (8 seconds for deaths or interrupts) show windup, movement/projectiles, hits, protection, healing, panic, and death. Displayed health and scores change at event impact. Reconnection seeks the current timeline. Reduced motion retains the same information and timing.

## Developer playground

```powershell
npm.cmd run dev -- --test
npm.cmd run dev -- --test --port 3001
npm.cmd start -- --test
```

Open the displayed `/#/test` URL, join, then Start. Four crews contain 1, 2, 3, and 4 characters. Every player has a separate authenticated session. Switch crew/member to control anyone, including spirits; Auto returns that player to a bot. Other connections stay alive. Bots submit through the same validated Socket.IO events as humans.

The collapsed debugger provides normal/fast/manual pacing, phase advance, disconnect/reconnect, answer inspection, and fresh/split/treasure/critical/question/final/duel scenarios. Nonfresh fixtures start in manual mode so they remain inspectable. Manual mode advances only through the debugger. Reset creates a new in-memory match. Classroom saves are never used by fixtures. Test routes are absent in normal mode; test mode refuses non-loopback binding.

`npm test` runs automated tests. `--test` starts the interactive playground.

## Optional crew duels

After an encounter, challenge another crew still at the same normal or elite battle node.
Challenges appear in the crew-meeting section. A strict majority of living members in each
crew must agree; anyone can decline. Every living fighter must have at least half health at entry. Offers expire after 30 seconds (paused during a host
pause or shared question). Leaving the node cancels an offer. A duel starts only when both
crews finish their encounter and equipment decision. Other crews continue exploring.

Each crew wagers up to three carried treasure. There are three simultaneous exchanges:
Strike deals twice your power, Guard blocks twice your power in total, and Feint deals your
power while ignoring Guard. Each student selects a rival or guards. Missing actions guard
after 45 seconds. Dungeon equipment and class skills are reserved for dungeon encounters.
Health cannot fall below one; the crew removing the larger fraction of the rival crew’s starting expendable health wins the stakes. Attack overflow reaches other rivals, so a solo hero does not waste its crew-sized damage. Draws
return them. Secured treasure cannot be wagered. Both saved dungeon continuations resume.

Each pair can receive only one challenge per expedition. A crew may participate in at most
two offers total, including declined offers. After a completed duel, two further rooms are
protected. Camps, caches, mysteries and the guardian cannot host challenges. These bounds
make this a deliberately small consent-based PvP prototype, not a forced ambush system.

## Original art and inscriptions

Enemy silhouettes, chamber motifs, and equipment/seal icons use original simple curves and
geometric strokes. No downloaded artwork or commercial-game assets were introduced. Answer
colors consistently identify A/B/C/D; they do not signal correctness. Reduced motion disables
the theatrical transitions without changing result timing. The map distinguishes current,
visited and reachable nodes; public position updates keep other crews visible between your
own actions. Inspect a node for crew names and member counts.

The 15 questions are newly authored applied game-development scenarios: input ownership,
control clarity, prototyping, feedback, authority, performance, accessible controls, balance,
state management, production, fairness, data definitions, request recovery, risk/reward, and
playtesting. They are labelled original course practice. No claim of exact Week 4 slide
alignment is made: the lecture source files were not available at the inspected project paths.
Review their curricular coverage before using them for assessment.

## Sessions and storage

Host and player tokens stay in separate browser storage and are hashed server-side. A second tab is read-only until explicit takeover. Accepted inputs survive reconnection; offline gameplay is not buffered. Requests contain match, phase, and request IDs; payload-changing ID reuse is rejected. Lost acknowledgments recover from durable receipts, including when the action already advanced the phase.

Explicit End closes mutation authority and scores already secured treasure; results remain viewable. If the controlling host disconnects, students continue for 90 seconds, then the expedition pauses with all progress preserved. Reconnect and press Resume. Restart restores active expeditions paused at their last durable save, including accepted inputs, question state, duel stakes and elapsed reveals. Offline wall-clock time does not consume phases. Host reconnection never automatically resumes a paused room.

New saves use schema 7, `dungeon-v2`, and ignored `data/rules-v7/`. Older save directories remain untouched. Content is frozen into each room. The per-room queue orders mutations, batches queued writes, and atomically saves state plus receipts before acknowledging. Failed saves pause only the affected room and show a persistent error. Do not run two servers against the same save directory.

## Hosting and moderation

**Host a match** creates a room in one click. Anyone with the game URL can create their own
room; each room's host controls require its private session token. Joining an existing room
does not grant host rights. Creation retries use the same saved bootstrap secret.

The separate private key in `data/host-access.key` is only for recovering host access if browser
storage is lost. Normal hosting and refresh do not need it. Never put it in a join URL.

The host toolbar has Pause/Resume, Invite, and More. More contains lobby learning/pacing
settings, new-PvP policy, question skipping before answers lock, and confirmed End.
Each crew tile's three-dot menu offers crew pause/resume, +30 seconds on timed decisions,
forced missing-choice defaults, duel cancellation before settlement, and device recovery.
A duel pause affects both crews. Cancellation refunds stakes once and retains committed
health damage. Completed question costs/rewards cannot be rewritten. Interventions appear
once in the shared log.

For a replacement student device, select the student in the crew menu and generate a private
12-character code. The student opens the room, expands **Reconnect on a replacement device**,
and enters it within five minutes. The existing character and choices return; the previous
device loses authority. Codes are hashed in saves and absent from projector snapshots.

If host browser storage is lost, expand **Recover a hosted room** on the home screen. Enter the
room code and the recovery key from `Get-Content .\data\host-access.key` on the server laptop.
This rotates host access and leaves play paused until Resume.
Read-only tabs do not count as controlling presence. The Connections panel shows offline
players; save failures stay in persistent banners.

Gameplay uses a 20-request burst/10 per second per identity. Authentication allows five attempts
per ten seconds per socket; recovery allows five attempts per minute per socket and twenty per
room. This server allows five new rooms per minute. Pending room work is
capped at 512 commands. Successful duplicate receipts bypass gameplay throttling.

## Development and verification

`src/shared` owns contracts; `src/game` owns deterministic rules; `src/server` owns sessions, clocks, persistence, and independent crew scheduling. `src/client` owns scoped input and presentation. Phaser never decides gameplay. The implementation uses the existing libraries, without adding a state-machine framework or dependency-injection layer.

```powershell
npm run lint
npm run check
npm test
npm run build
npm run test:e2e
npm run test:load
```

`npm run format` applies Biome. Playwright needs Chromium, or set `$env:HEIST_BROWSER_CHANNEL = "msedge"` for installed Edge. The load harness uses real clients, temporary atomic saves, an injected clock, and deterministic choices. It includes a simultaneous student reconnect burst and a 20ms client-side ACK-delivery delay, and reports measured latency rather than claiming unlimited capacity. See [verification](docs/verification.md).

`.Codex/` contains ignored temporary planning only. It is not imported, served, built, or required at runtime. Screenshots and measurement reports are in ignored `test-results/`.
