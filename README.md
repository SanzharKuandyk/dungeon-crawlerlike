# Dungeon Crawlerlike

A three-chapter dungeon expedition for phones, tablets and laptops. Every student controls a
character; crews of 1–4 explore independently. There is no fixed crew limit. Three bosses,
persistent builds, recovery and two shared Trials of Wagers lead to a ranked result.

## Launch

From `C:\Projects\lectures\dungeon-crawlerlike`:

```powershell
npm install
npm run dev
```

Open **http://localhost:47831**, click **Host a match**, invite students, then **Start expedition**.
No account or installation key is needed. Students join a crew and choose their own class.
Invite provides the room link/QR. The host's crew grid shows readiness, connections and encounters;
Map, Dungeon and Log are separate views. The host can pause, resume, moderate or end the expedition.

For production:

```powershell
npm run build
npm start
```

Use the pinned Node 24 runtime/dependencies. Development runs `tsx watch`; production runs compiled
JavaScript. In PowerShell, use `npm.cmd` when passing extra arguments. `--port` or `PORT` overrides
47831. LAN binding is explicit: `npm.cmd run dev -- --host 0.0.0.0`. An invite base URL changes
links only. Tunnel setup remains external to this project.
Source TypeScript uses `.js` imports because the server compiles with NodeNext: TypeScript resolves
the corresponding `.ts` source while Node loads the emitted `.js` file. Keep these import paths.

## Expedition

Each chapter has seven ascending map rows: opening battle; merchant/cache/event; battle/elite;
convergence altar or shrine; camp/merchant/optional arena; camp/elite; boss. Three maps are generated
once and saved. Each crew has its own chapter, location and clock. Browsing stays where you leave
it; **Locate crew** returns to your current position.

Attack the body to defeat an enemy, or break its seal to disable the shown modifier. Excess seal
damage reaches health. Shield absorbs damage separately. Enemy intent shows the next move, damage,
stress, Bleed and disclosed injury odds. Block, class skills and healing items provide alternatives
to attacking. Skills are available again two turns after use. All six classes work in every crew size.

Choosing an action is a local preview. Press **Ready** to commit it; teammates immediately see the
submitted action in the crew strip. **Change** removes readiness while the decision remains open.
The last ready member starts the turn automatically; a solo character uses **Play turn** instead.
Fallback is off by default for new matches. When enabled, its visible timer resolves missing
choices at the deadline (60 seconds for results). Manual test mode requires
**Next phase**. The turn strip follows Choose → Crew → Enemy → Outcome, and the action panel shows
resolved effects during the reveal. Health and conditions follow those presentation events.
**Last turn** retains a structured summary after the animation. Selecting a support target
highlights that character in the scene. Named effect chips show injuries, Bleed damage/duration, equipped bonuses and Blessings; tap for
details. Used encounter bonuses are marked **Used**, with their reset rule in the inspection.

Heroes start with equal crew-wide budgets: 48 total health and 24 basic attack damage. Power stays
frozen after disconnects, deaths and revival. Prices, equipment, healing and barriers scale by power.
Stress bands reduce damage before panic at ten stress. Injuries, Afflictions, equipment and up to two
Blessings form a persistent build. Inspect compact condition badges or open **Backpack** for details.
Health/stress bars, enemy intent and action previews use icons and numbers. Tap an indicator for its
explanation. Backpack's **Gear** tab has three equipment slots and six item slots; select one item
to inspect, equip, use or transfer it. **Traits** contains Blessings and lasting conditions.
Merchants use item tiles and one purchase panel; wager cards show their multiplier and consequence.
Map icons distinguish merchants, shrines, trials and arenas with restrained category colors.

After the final combat reveal, **Victory**, **Escaped** or **Defeated** stays open for your crew.
Results show actual gold, rescue-debt repayment and character changes. Ordinary victories award
only gold; caches, elite victories and bosses also offer each registered hero one of two equipment
items, including spirits. Choose **Equip**, **Keep**, **Leave reward**, or **Save for later**.
Equip moves the old item to the backpack; a full backpack requires an explicit replacement.
**Rewards** at a later safe stop contains saved offers. Refreshes do not reroll or lose them.

Every member presses **Ready to travel** after resolving or saving fresh offers. The last ready
member continues; **Change** reopens your decision before that happens. Other crews continue
independently. An absent member's offers remain saved after the existing 15-second default;
a crew with nobody connected stays suspended. Manual test mode always requires Next phase.
Shared trials preserve an open result and its remaining time.

Safe stops open one service at a time: **Supplies**, **Treatment**, **Backpack**, or the crew's
**Rest / Leave** decision. Individual purchases and treatment require confirmation and show the
actual committed item, price and destination. **Your budget** is your reserved share, not all crew
gold. Shopping locks once you are ready; Change reopens it while the crew is still there. Rest shows
its health/stress preview, then a **Rested** result before travel. Ordinary stops cannot be rested
repeatedly. Recovery rules are unchanged.

Gold buys weapon/armor/charm equipment, consumables, treatment and revival. There is no carried or
secured treasure, banking or generic Loot action. Six backpack slots support stacks of three
consumables. Item overflow asks Keep, Replace or Leave. Each shop visit freezes stock and reserves
an individual allowance from the crew wallet; another member cannot spend that allowance.

Fallen characters become spirits and can Ward teammates. Revival costs twice that hero's power at
a recovery stop. Spirits can request personal rescue at the next room boundary. A full wipe loses
half available gold, adds 24 rescue debt and returns the crew at half health/three stress. Future
rewards pay debt first; equipment, traits and completed boss credit survive. Ordinary/elite fights
allow four turns; bosses allow six and must be defeated before advancing. Boss retries preserve
damage already dealt so debt/injury cannot permanently exclude a crew.

Ranking is **bosses defeated → furthest completed chapter/room → normalized trial points**. Gold
is spending money, not score. Completion and rewards are once per node; refresh/retry cannot farm
them. Third-boss survivors finish and may still participate in a pending class trial. Ties share victory.
35–45 minutes is a classroom playtest target, not an automatic cutoff.

### Trials of Wagers

The first crew reaching chapter 1/2's altar announces its trial. Other crews finish their active
reveal, then freeze at a safe decision boundary with accepted choices, budgets and clocks preserved.
Each trial plays three questions from a three-category, 100/200/300 board, one per value band.
Members vote; every crew contributes one class vote, regardless of size.

Before seeing the problem, each student commits Steady (1×; wrong +1 stress), Bold (2×; wrong +3
stress), or Oath (3×; wrong adds the named Affliction). Missing stakes default to Steady. Answers are
private and final. Crew points average all registered members including spirits, using exact integer
units over 12. Reveal retains the question/options, marks your answer and the correct answer, and
explains the result. Correct students earn a rank-I/II Blessing choice; tied winning crews receive
three offers rather than two. Offers and grants survive refresh/restart without duplication.

**Classroom trial content is not yet complete.** Development has 18 clearly marked fixture questions.
Normal matches cannot enable trials until `content/learning/trials.reviewed.json` passes validation.
Supply three categories with two reviewed variants per category/value cell, four plausible options,
correct/distractor explanations, code under 12 lines and verified lecture file/slide references.
Use the shape in `trials.fixture.json`, set `fixture: false` and each `reviewed: true` only after review.
The server validates structure; a teacher must verify the citations and taught coverage.

### Optional arenas

An arena is consent-based and separate from knowledge trials. Crews in the same chapter may
challenge one another; every member can decline and each crew needs a strict majority. A waiting
crew may cancel or choose an NPC champion after 20 seconds. Each crew can complete one physical
arena encounter. Three Strike/Guard/Feint exchanges are nonlethal. Dungeon equipment, conditions,
Blessings and class skills are suspended, then restored unchanged; resolved health loss remains.
Winner: 12 gold and consumables; loser/draw: 6 gold and consumables. Arena rewards never add rank points.

## Developer playground

```powershell
npm.cmd run dev -- --test
npm.cmd run dev -- --test --port 3001
npm run build
npm.cmd start -- --test
```

Open the displayed `/#/test` URL and **Join test match**. Four crews contain 1, 2, 3 and 4 players,
each with a separate authenticated session and pending-request storage. Switch among all ten
identities, including spirits. Auto bots use normal validated client commands; Manual lets you
choose classes, paths, actions, stakes, answers, equipment and treatment yourself.

The collapsed debugger provides fast/normal/manual timing, phase advance, reset, selected-identity
disconnect/reconnect and active-answer inspection. Scenarios cover fresh/split fights, critical
health, injuries, panic, inventory overflow, shop contention, revival, every trial phase, boss
thresholds, final chapter, duels, gold-only results, personal rewards and full-backpack rewards. Reset creates a new in-memory match. Manual mode never advances
automatically. Test endpoints are unavailable on normal startup; test mode requires loopback binding.

The development-only `/#/gallery` shows populated shared controls, reward comparisons, pending,
rejected, full-backpack and reconnect states. It is unavailable in normal mode.

`npm test` runs automated tests. The `--test` launch argument starts the playable developer game.

## Recovery and persistence

Schema **9**, rules **dungeon-v4**, saves **data/rules-v9/**. Older save directories remain untouched;
this version does not reinterpret older expeditions. Authenticated identities, accepted commands,
request receipts, frozen content, RNG, builds, shop budgets and reward markers are saved atomically.
Duplicate successful requests return receipts; changed-payload request-ID reuse fails.

Host loss has a 90-second grace, then pauses and preserves play. Reconnecting or restarting restores
access but requires explicit Resume. Offline server time never consumes the saved clocks. Pause
reasons compose across room/crew/trial/duel. A save failure keeps the previous committed state and
shows a persistent host banner. Read-only tabs do not count as controlling presence.

Crew menus offer pause/resume, timed extension, missing-choice resolution and private device recovery.
Host recovery uses a private recovery key for existing rooms; it does not gate ordinary room creation.
End, forced resolution, duel cancellation and device replacement require confirmation. Public views
and logs never contain recovery codes, session material, private answers or future solutions.

## Verification

```powershell
npm run lint
npm run check
npm test
npm run build
npm run test:e2e
npm run test:load
npm run test:balance
npx.cmd tsx scripts/simulate-rewards.ts
```

The focused `simulate-rewards.ts` run uses 60 clients in 15 crews, durable claims, duplicate
requests and result readiness; it does not repeat the full load suite for styling changes.

Load tests use real Socket.IO clients and atomic temporary saves for 32, 60 and 128 clients. Balance
simulations cover all six solo classes and representative 2/3/4-member crews. Reports go to ignored
`test-results/`; Playwright clears that directory at startup, so preserve reports before another run.
Measured results and balance adjustments are in [docs/verification.md](docs/verification.md).

All art is original code/vector geometry. White surfaces, visible borders, short labels, touch
inspection, reduced motion and a persistent Phaser scene support portrait/landscape phones and
classroom displays. Bits UI is pinned at 2.19.5 with date peer 3.8.1; existing stack versions remain
pinned. `.Codex/` is ignored temporary development planning and is never imported by the application.


The trading post uses compact stock, a fixed item inspector and purchase footer. Camp focuses on
rest, treatment and backpack; Supplies opens at trading locations. Original colored item artwork
and semantic action/stat icons retain white surfaces. The map offers larger detail, a whole-route
overview and Locate crew; live snapshots preserve manual browsing.
The developer debugger's `rescue` scenario starts a wiped crew at a failed encounter so revival,
rescue debt, retry and refreshed-session recovery can be exercised through normal controls.

Character names are Knight, Healer, Mage, Thief, Fighter and Priest. Their skills are Protect,
Heal, Blast, Steal, Hit & Block and Drain. The former Brace action is labelled Block. Saved IDs
stay unchanged. Enemy intent sits above the enemy; an actual broken seal appears beneath it
when the hit resolves. Tap either badge for details; displayed damage is before your protection.
