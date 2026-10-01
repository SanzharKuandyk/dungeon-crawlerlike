# Sector Siege · Dungeon Expedition

A laptop-hosted competitive dungeon game. Each student controls one character on a phone or laptop. Crews of 1–4 choose rooms together, fight shared enemies, compete for treasure, and decide what to secure. There is no fixed crew limit; see [measured verification](docs/verification.md).

## Launch

Run from C:\Projects\lectures\salvage-heist with the pinned Node 24 runtime and npm dependencies:

~~~powershell
npm install
npm run dev
~~~

Open http://localhost:3000. Create a room, invite students, and press **Start expedition** after everyone joins a crew. The host sees a grid of crew expeditions. **Invite** opens the QR/link; **Projector** opens the public board. The host can pause, resume, or end. All other phases advance automatically.

~~~powershell
npm run build
npm start
~~~

Use npm ci to restore the exact lockfile. No dependency upgrade is needed.

## Developer playground

~~~powershell
npm.cmd run dev -- --test
npm.cmd run dev -- --test --port 3001
npm.cmd start -- --test
~~~

Open the displayed /#/test URL, click **Join test match**, then **Start**. Four crews contain 1, 2, 3, and 4 characters. Every identity has its own authenticated connection and pending requests. Crew/member buttons control anyone, including spirits. Selecting a character takes manual control; **Auto** returns it to a deterministic bot. Other sessions remain connected.

Choose classes in the lobby. During play, use the normal controls for rooms, actions, withdrawal votes, answers, equipment, and camp decisions. The collapsed **Test debugger** contains normal/fast/manual speed, Next phase, disconnect/reconnect, answer inspection, and scenarios: Fresh expedition, Split rooms, Treasure contest, Critical health, Question reward, Final depth. Manual mode never advances automatically. Reset creates a fresh in-memory match.

PowerShell may consume arguments through npm.ps1; use npm.cmd with --test, --host, or --port. npm test runs automated verification; --test enables interactive play. Test routes and controls are absent in normal mode. Test mode refuses non-loopback binding.

## Play

Five depths offer three authored rooms: Sentinel/low risk, Seer/medium risk, Devourer/high risk. Crews vote for a destination; several crews can share a room and enemy. Missing votes abstain; ties rotate among living members. No route votes chooses low risk.

Each character chooses Attack, Brace, Loot, or a class skill. Enemy intent and its weak-point modifier are announced before choices. Breaking the weak point disables that modifier immediately; destroying the body cancels the attack. Rooms last at most four combat turns. Missing fighting actions become Brace. Attacks resolve simultaneously.

| Class | Skill |
|---|---|
| Knight | Protect a living character in the same room |
| Physician | Mend a living character in the same room |
| Occultist | Hex an enemy part; gain stress |
| Scavenger | Pilfer: damage the body and claim treasure |
| Wanderer | Skirmish: damage, self barrier, and stress; crews of 1–2 |
| Exorcist | Channel: damage, self healing, and stress removal; crews of 1–2 |

Crew sizes have equal starting totals: 48 health and 24 basic attack damage. Each student makes their own choice. Numbers freeze at start; death/disconnect never rescales them. Joining a third member resets restricted classes to Knight with a visible notice.

Treasure bundles reward the strongest surviving claims, with rotating ties and at most one bundle per crew per turn. Loot sacrifices an attack; Devourers punish treasure hunters until their weak point breaks. Meaningful damage, healing, and absorbed living barriers build a participation meter for victory purses. Loot-only and spirit aid earn no participation credit.

Death is permanent. Fallen students become spirits and can Ward living fighters anywhere. Completed or withdrawn crews can send aid while waiting at camp. Strictly more than half of living members must vote to withdraw; it adds stress, preserves carried treasure, and earns no victory purse.

After depths 1–4, crews choose **Secure** (bank treasure), **Rest** (heal and reduce stress), or **Bargain** (gain stress for extra damage next depth). Stress reaching six causes barrier-ignoring panic damage and resets to three. Losing the last living member discards carried treasure; secured treasure remains. After depth 5, survivors automatically secure and extract. Highest secured treasure wins; ties share victory. Ending early counts secured treasure only.

## Inscriptions and equipment

An actual weak-point break, enemy defeat, or treasure discovery can reveal one inscription per depth at depths 1–4. Its cause is narrated before the question appears over the existing board. The original 15 Week 4 questions retain topic and slide references; the deck shuffles once and never repeats. Solutions stay server-only until answers lock.

Every registered student, including spirits, answers privately once. Perfect crews earn two charges; partly correct crews earn one; missing answers count as incorrect. Each living member chooses Ward, Salve, Lantern, or Keep current. Ward absorbs damage after barriers, Salve heals a surviving wounded hero, Lantern lowers dangerous stress before panic. Charges are spent only when useful; rewards activate at the next combat decision. First treasure bundles also grant Ward to surviving unequipped members. Questions grant no score. Learning can be disabled before starting.

Normal phases: route 25s, arrival 4s, combat 45s, reveal 10s, recap 3s, floor result 6s, camp 25s, camp reveal 6s, extraction 10s. Inscriptions add 2s introduction, 35s answering, 8s explanation, 20s equipment, 2s return. A full expedition targets 24–29 minutes; early deaths, withdrawals, and disabled questions shorten it.

## Hosting and recovery

One Node process serves Vite during development or built files in production, plus Socket.IO. Loopback is default. For LAN access:

~~~powershell
npm.cmd run dev -- --host 0.0.0.0
~~~

Set **Invite → Join base URL** to the laptop's reachable origin if needed. This sets links only; no hosting or tunnel configuration is included.

Separate host/player credentials stay in browser storage and are hashed server-side. Reconnection restores accepted inputs. Latest authenticated tab controls an identity; previous tabs become read-only. Host disconnection does not stop the class. Offline gameplay actions are not buffered. Requests use match/phase/request IDs, bounded same-phase retries, and durable receipts; changed payloads cannot reuse IDs.

Schema 4 / dungeon-v1 saves live in ignored data/rules-v4/. Earlier saves and the existing backup are untouched and never reinterpreted. Matches freeze content. Atomic writes and per-room queues serialize mutations; successful acknowledgments follow saves. Restart restores active expeditions paused. Save failure pauses its room and displays an error. Never run two servers against one save directory.

## Architecture and checks

src/shared defines contracts, validation, and palette. src/game contains deterministic rules/projections. src/server owns authentication, deadlines, queues, persistence. src/client contains scoped player controllers and Svelte screens; Phaser renders presented outcomes. Crew tiles use original SVG characters/rooms, with no copied commercial game assets.

Reveals use a fixed timeline, presentation start frame, and typed events. Health, treasure, narration, and history seek to server time on reconnect. Private inputs stay out of rival/projector projections. Reduced motion preserves outcome timing. Earlier event pages remain readable without forced scrolling.

~~~powershell
npm run format
npm run lint
npm run check
npm test
npm run build
npm run test:e2e
npm run test:load
~~~

Playwright requires Chromium (npm exec playwright install chromium if missing). The load harness uses real clients and temporary atomic saves, advancing an injected server clock after commands finish. Reports/screenshots go to ignored test-results/. .Codex/ is ignored temporary development planning; it is not imported, served, built, or required by the application.

