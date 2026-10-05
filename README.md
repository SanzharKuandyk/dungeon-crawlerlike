# Dungeon Crawlerlike

A two-chapter dungeon expedition for phones, tablets and laptops. Every student controls a
character; crews of 1–4 explore independently. There is no fixed crew limit. Two bosses,
persistent builds, recovery, three shared Trials of Wagers and a cooperative siege lead to a ranked result.

## Launch

From `C:\Projects\lectures\dungeon-crawlerlike`:

```powershell
npm install
npm run dev
```

Open **http://localhost:47831**, click **Host a match**, invite students, then **Start expedition**.
No account or installation key is needed. Students join a crew and choose their own class.
Invite provides the room link/QR. The host's crew grid shows readiness, connections and encounters;
all crews appear in two columns with more rows below, stacking into one column on narrow phones.
Map, Dungeon and Log are separate views. The host can pause, resume, moderate or end the expedition.
Combat keeps identity, health/stress, intent and a compact action dock visible. Untimed turns say
At your pace; crew readiness remains visible, with effects inspectable before confirmation.
On narrow portrait phones, larger encounters use two-character rows. Tap an enemy or ally in the
scene to select the action target; tap character effect icons or crew portraits to inspect builds
and confirmed actions. Bag stays in the HUD, and Ready stays below the scrolling scene/choices.
Post-fight equipment choices open over the scene with item effects, comparison and fixed action
buttons. Choose Equip, Store in Bag, Upgrade or Leave reward before travelling. Closing the popup
does not decide: reopen with Choose reward. Ready to travel is a separate crew decision.
Equipping names the replaced item and moves it to the Bag. Gear stays fixed during fights,
shared events and readiness; at a safe stop, Change reopens choices. Unequip needs a free Bag slot.
Blue Block below health shows damage protection remaining this turn, not healing. Guard coat
adds protection when choosing Block; Ward vest absorbs part of the first hit that reaches it.
Last turn and the event log name the actual source and amount of absorbed damage.

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

Each chapter has twelve ascending authored rows, with teaching battles, merchants, caches,
camps, optional danger, events and a distinct boss. Both maps are generated and saved at Start.
Crews have independent chapters, locations and clocks. The compact overview and detailed route
preserve browsing by room/crew/chapter; **Locate crew** returns to your position.

Enemies have **Health + temporary Block**. Damage consumes Block before health. Enemy Block
protects the next player phase, then expires; there is no Seal or separate weak-point target.
Published intent shows actual targets, damage, stress, Bleed and disclosed injury odds. Raiders,
guards, whisperers, supporters and devourers have distinct patterns. Ordinary/elite rooms may
contain multiple enemies; chapter bosses combine learned patterns and change phase at thresholds.
Their move cycles, magnitudes and disclosed injury odds live in `content/dungeon/enemies.json`,
validated at startup and frozen in each match/encounter. Guards teach Block → Strike → Heavy strike;
the Iron Warden uses defense → heavy blow → exposed strike. Health/reward tuning remains in
`content/dungeon/balance.json`. See [the complete player feature table](docs/gameplay.md) and
[measured verification results](docs/verification.md).

Every living character normally chooses one action. A **Haste Charm** can grant a second action
once per encounter attempt (rank II also gives personal Block). Choose both slots before Ready;
a plan allows at most one signature skill and one consumable. Mage **Blast** damages and Marks;
an eligible follow-up action consumes Mark for extra damage. The creator's same action cannot
consume its new Mark. Effects, expiry and used traits are visible under characters and enemies.
All six classes work at all crew sizes; skills are available two turns after use.

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
Results show actual gold, rescue-debt repayment and character changes. Every first victory and cache offer each registered hero one of two equipment
items, including spirits. Choose **Equip**, **Store in Bag**, **Upgrade**, or **Leave reward**.
Gear has two ranks; owned rank-I choices can upgrade to II. Fully developed builds receive useful
supply options. Every offer is private, frozen and once-only.
Equip moves the old item to the backpack; a full backpack requires an explicit replacement.
**Rewards** at a later safe stop contains saved offers. Refreshes do not reroll or lose them.

Every member presses **Ready to travel** after resolving their pending offers. The last ready
member continues; **Change** reopens your decision before that happens. Other crews continue
independently. An absent member's offers remain saved after the existing 15-second default;
a crew with nobody connected stays suspended. Manual test mode always requires Next phase.
Shared trials preserve an open result and its remaining time.

Safe stops open one service at a time: **Supplies**, **Treatment**, **Backpack**, or the crew's
**Rest / Leave** decision. Individual purchases and treatment require confirmation and show the
actual committed item, price and destination. **Your budget** is your reserved share, not all crew
gold. Shopping locks once you are ready; Change reopens it while the crew is still there. Rest shows
its health/stress preview, then a **Rested** result before travel. Ordinary stops cannot be rested
repeatedly. Camp Rest is once per node. Merchants sell supplies and rank-II upgrades; checkpoints are not shops.

Gold buys weapon/armor/charm equipment, consumables, treatment and revival. There is no carried or
secured treasure, banking or generic Loot action. Six backpack slots support stacks of three
consumables. Item overflow asks Keep, Replace or Leave. Each shop visit freezes stock and reserves
an individual allowance from the crew wallet; another member cannot spend that allowance.

Fallen characters become spirits and can Ward living teammates. **Only a living teammate** can
revive a fallen ally, at a camp/merchant or safe postfight recovery decision. The named Revive
button is outside the shopping menu: pay `2 × target power` shared gold, or rescue debt if gold
is insufficient. A spirit's **Request revival** only notifies teammates; it never revives itself.
No combat skill, consumable, Block or Mark revives a dead character.

A full wipe (including a dead solo character) offers **external rescue**: lose half the available
gold, add 24 debt, return at half health and at least 3 stress. Gear, traits, injuries and spent
expedition uses survive. After the recovery result, choose Retry or ordinary-room retreat.
Bosses must be defeated; retries preserve boss damage/thresholds but clear temporary Block/Mark.
Ordinary battles allow four turns, elites five, bosses eight. Retries cannot farm rewards or Steal.

Ranking is **bosses defeated → furthest completed chapter/room → normalized trial points**. Gold
is spending money, not score. Completion and rewards are once per node; refresh/retry cannot farm
them. Second-boss survivors finish and may still participate in a pending class trial. Ties share victory.
35–45 minutes is a classroom playtest target, not an automatic cutoff.

### Trials of Wagers

Three scheduled checkpoints trigger two questions each: chapter 1 row 5 (100/200), chapter 1
row 10 (200/300), chapter 2 row 6 (100/300). Every trial has three categories and uses each available
value band once. Members vote; every crew contributes one class vote, regardless of size. Tile
badges show crew choices, selection explains ties, and committed stakes can be inspected publicly.
Other crews finish running reveals before the handoff; paused reveals preserve their elapsed time.

Before seeing the problem, each student commits Steady (1×; wrong +1 stress), Bold (2×; wrong +3
stress), or Oath (3×; wrong adds the named Affliction). Missing stakes default to Steady. Answers are
private and final. Crew points average all registered members including spirits, using exact integer
units over 12. Reveal retains the question/options, marks your answer and the correct answer, and
explains the result. Correct students earn a rank-I/II Blessing choice; tied winning crews receive
three offers rather than two. Offers and grants survive refresh/restart without duplication.
Speed gives no bonus. New matches also award gold per question: `floor(value / 100 × 6 × sum
of correct wager multipliers / registered crew size)`. A fully correct crew earns 6/12/18 gold
on a 100 question with Steady/Bold/Oath; 200 and 300 scale proportionally. Spirits count and
can earn rewards. Gold first repays rescue debt. Older saved matches retain their frozen rules.

**Week 5 trial content is installed** in `content/learning/trials.reviewed.json`: 18 distinct
questions across Run Rules, Hits & Rewards, and Time & Feedback, with two variants per value cell.
Self-contained hypothetical scenarios use Subway Surfers, Angry Birds, Candy Crush, Clash Royale
and Brawl Stars. Rules and numbers are supplied in each question; students need no prior game or
lecture knowledge. These are original teaching scenarios, not reports of bugs in those games.
Each answer and distractor is explained, and each question cites checked slides from
`MGD/presentations/MGD_5_week.pptx`. Short code traces appear in 200-point questions.
The pack is available in normal and developer rooms; questions appear only in the three scheduled checkpoint
trials, not after fights, caches, shops or arenas. Learning can be disabled before Start.
Existing expeditions retain their frozen content, including older fixture packs. Create a new room
to use an updated bank. Teacher playtesting of difficulty and reading time remains necessary.
The labelled development fixture is only a fallback if the reviewed pack is absent; it cannot
enable classroom trials. The old Week 4 bank is not loaded.

### Optional arenas

An arena is consent-based and separate from knowledge trials. Crews in the same chapter may
challenge one another; every member can decline and each crew needs a strict majority. A waiting
crew may cancel or choose an NPC champion after 20 seconds. Each crew can complete one physical
arena encounter. Three Strike/Guard/Feint exchanges are nonlethal. Dungeon equipment, conditions,
Blessings and class skills are suspended, then restored unchanged; resolved health loss remains.
Both crews must be at arena nodes in the same chapter. A single living No vetoes participation.
Winner: 12 gold, personal equipment choice and consumables; loser/draw: 6 gold and consumables. Arena rewards never add rank points.

### Exploration and siege

A coin fountain lets each student choose Heads/Tails and gold/Blessing, stake their reserved
power-scaled gold, or Leave. The fair 50/50 result, stake and reward/consequence are visible to
the host. Trapped caches publish injury odds; sacrificial altars publish health costs; quiet
shrines offer deterministic recovery. Refreshing never rerolls a committed event.

Chapter 2 row 10 starts a three-round **cooperative siege**. All crews choose Attack, Protect or
Supply together; spirits may Supply. Three visible class meters determine success. Success grants
12 gold per crew and a healing draught per registered hero; failure causes 2 stress, including
normal panic rules. Crew turns, shopping, results and arena continuations resume afterward.

See [the complete player feature table](docs/gameplay.md) for every mechanic, node and restriction.

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
thresholds, final chapter, duels, personal rewards, full backpacks, multi-enemy combos/Haste,
coin choices and the siege. Reset creates a new in-memory match. Manual mode never advances
automatically. Test endpoints are unavailable on normal startup; test mode requires loopback binding.

The development-only `/#/gallery` shows populated shared controls, reward comparisons, pending,
rejected, full-backpack and reconnect states. It is unavailable in normal mode.

`npm test` runs automated tests. The `--test` launch argument starts the playable developer game.

## Recovery and persistence

Schema **10**, rules **dungeon-v5**, saves **data/rules-v10/**. Older save directories remain untouched;
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
requests, readiness, coin/trial submissions, reconnect bursts and combat plans. It does not repeat
the unrelated full load suite for styling changes.

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
and semantic action/stat icons retain white surfaces. The map offers larger detail, a compact scrollable
route and Locate crew; live snapshots preserve manual browsing.
The developer debugger's `rescue` scenario starts a wiped crew at a failed encounter so revival,
rescue debt, retry and refreshed-session recovery can be exercised through normal controls.

Character names are Knight, Healer, Mage, Thief, Fighter and Priest. Their skills are Protect,
Heal, Blast, Steal, Hit & Block and Drain. The former Brace action is labelled Block. Saved IDs
stay unchanged. Enemy intent sits above the enemy; actual Mark and Block effects appear beneath it
when their events resolve. Tap either badge for details; displayed damage is before your protection.

Responsive routes reserve readable space for each node and label. On short landscape screens,
the map scrolls beside its destination inspector and travel controls. Bag stays on one line.
**Store in Bag** claims the selected reward immediately. Rewards must be resolved before manually
readying travel; automatic absence/host defaults preserve unclaimed choices. Target selection uses
a quiet name underline with visible keyboard focus. Combat health/build controls follow the contained
scene coordinates, with bounded touch targets rather than full-width invisible buttons.
