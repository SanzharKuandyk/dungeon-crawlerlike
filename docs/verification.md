# Target selection and immediate rewards · 2026-10-05

Removed the blue selected/hover frame around scene actors; target names underline instead,
with separate visible keyboard focus retained. Removed manual Decide later from controls,
claim types, rule handling and protocol validation. Online result readiness requires resolving
every pending personal offer, including previously saved ones. Automatic offline/host defaults
still preserve unclaimed entitlements; dismissing the chooser never claims or advances.

Lint, type checks and build passed. Five affected reward rule/server tests and three existing
browser flows passed (reward/equip/readiness, full-Bag replacement, gear operations/readiness).
Updated existing tests rather than adding icon/style assertions or rerunning unrelated suites.
Four populated captures in ignored .Codex/immediate-rewards at 360x640 and 667x375 have no
horizontal overflow; reward footer bottoms are 639/640 and 366/375. Selection and both reward
layouts visually inspected. Preview servers closed. Item balance and dependencies unchanged.

# Equipment, Block and trial clarity · 2026-10-05

Visible gear-lock reasons match safe phases/readiness/shared events/duels. Safe-stop Change
reopens gear controls; successful Unequip moves the owned item into Bag. Replacement previews,
reward footer and confirmed transactions name the displaced item. Guard coat now explains its
Block-action trigger. Blue Block tracks use presented health/Block rather than future snapshots.
Incoming-hit and Bleed events record actual protection sources; Last turn retains them.

Trials fully cover the mounted scene and enter with a short reduced-motion-aware fade. The
question precedes secondary metadata; duplicated HUD timer/effects are hidden during trials.
New rooms freeze trialGoldPer100=6 in content. Per-question gold is floor(value/100 × 6 × sum
of correct wager multipliers / frozen registered size), including spirits. Debt is paid first;
the existing resolved-question marker prevents repeat settlement. Older frozen balance without
this setting awards no new gold. Public gold details appear only at reveal. Blessing and ranking
rules remain intact; no speed or crew-size bonus. No save migration or dependency changes.

Two focused regression cases protect gold normalization/debt/duplicate settlement and actual
Guard coat/Ward vest absorption (including once-only vest use). All 54 affected rule/server tests
and six browser flows passed, alongside lint, type checking and build. Eleven populated captures across 360x640, 360x800, 667x375,
844x390 and 1366x768 show no page-width overflow. Reward/gear footers fit within each viewport;
a first short-landscape capture exposed footer overflow, corrected with a constrained dialog and
compact context. Combat-to-trial keeps the identical canvas; the trial pane fills its console.

Item combat strength is unchanged in this repair. Current solo Blade adds 12 to a basic 24 hit
(rank II adds 24); Ward vest absorbs up to 12/24 once each fight, and Guard coat adds 12/24 only
when blocking. These are balance review targets, not evidence that a flat 8 is fair for every
crew size. Human balance/clarity acceptance remains outstanding. Temporary preview servers close.

# Reward popup · 2026-10-05

Post-fight equipment selection now uses the shared accessible dialog over the persistent scene.
Both options show exact effects; comparison and overflow replacement scroll in the body while
operations stay fixed. Closing/reopening preserves offers and the same canvas. Confirmed claims
close the popup, retain transaction feedback, and leave travel as a separate crew decision.

Three focused browser flows passed: personal reward/equip/readiness and viewport rotation;
full backpack with explicit replacement; inventory operations and swapped-item destination.
Type checking and production build passed. Eight real-state captures across 360x640, 360x800,
667x375, 844x390, 768x1024 and 1366x768 showed no horizontal page overflow and reachable
operation footers. Short-phone full-inventory details scroll while the footer remains visible.
Existing Phaser chunk warning remains. No rules/schema/dependency changes or unrelated suite
reruns. Temporary screenshot/browser servers closed; human clarity review remains external.

# Responsive route/combat repair · 2026-10-05

Corrected route HUD tracks and nonwrapping Bag; 96/128px map row spacing and opaque label
backing; compact/detailed map toggle contrast; short landscape destination/travel sidebar.
The map remains scrollable rather than shrinking twelve rows until labels overlap.
Combat content tracks no longer stretch choices apart. Bounded 44px build buttons, intents,
readouts and persistent canvas use one measured scene frame, including HUD padding. A final
visual check caught content-box measurement shrinking the canvas; border-box measurement fixed
its alignment. Solo readiness duplicates are hidden; short phones retain reachable confirmation.
Reward labels now distinguish Store in Bag (claim now) from Decide later (pending choices).

Lint, Svelte/TypeScript and build passed. Eleven distinct affected browser flows passed across
combat, map/50 snapshots, Haste, readiness, conditions, rewards/overflow, shop, inventory and
host/projector; focused flows repeated after layout corrections. Actual captures include
360x640, 360x800, 412x915, 667x375, 720x900, 768x1024, 844x390, 950x600 and 1366x768,
portrait-landscape-portrait, focused build inspection and an accepted Block reveal.
All measured HUD/page widths fit; combat confirmation remains within the tested viewport.
Short landscape maps retain 206–221px of scrolling content (667/844px wide). Reward operation
footers remain reachable. Canvas preservation and manual map browsing regressions pass.
Existing Phaser chunk warning remains. No gameplay/schema/dependency changes or unrelated
load/balance reruns. Temporary screenshot/browser servers close in finally blocks.

# Compact combat interface · 2026-10-05

Presentation-only update: compact HUD and Bag; clickable scene targets with individual enemy
Health/Block; native-size labels; inspectable crew action portraits; larger two-column formations
on narrow portrait phones. The upper scene/choices scroll on short phones; confirmation remains
fixed. Haste activation has visible selected contrast and keeps the footer position stable.

Lint, Svelte/TypeScript checks and production build passed. Seven distinct focused browser flows
passed (eight executions): scene ally targeting, six-size combat fit, Haste/readiness/persistent
canvas, teammate Ready/Change and reveal, condition inspection, map/question layout, and shop
panel isolation. Capture verified 360x800, 360x640, 667x375, 844x390, 768x1024 and 1366x768;
Ready was fully visible and no horizontal page overflow occurred. Fourteen final screenshot
states are in ignored .Codex/combat-compact; shown crew choices were committed through real
Socket.IO clients. Temporary servers closed. No gameplay/dependency changes or unrelated
full rule/load/balance reruns. Human clarity/playability review remains the user's next step.

# Dungeon v5 verification · 2026-10-05

New rooms use schema 10 / dungeon-v5 / data/rules-v10. Old directories are untouched.
Two authored twelve-row chapters replace the seven-row maps. Enemies use Health and temporary
Block, individual intents, Mark follow-ups and bounded Haste action plans. Every first victory
has private ranked build rewards. Safe revival requires a living ally; external rescue handles
full-party defeat. Three scheduled trials and a cooperative siege restore crew continuations.
See [the complete player feature table](gameplay.md).

## Software and presentation checks

Lint, Svelte/TypeScript and production build pass. All 129 rule/server tests across 17 files pass.
Five integrated redesign cases cover deterministic Haste/Mark/Block, atomic gear upgrades and
ally revival, frozen personal chance rolls, once-only siege settlement including spirits, and
paused-reveal handoff with durable restart recovery. Existing receipt, ownership, moderation,
privacy, queue and reward tests remain. No icon-by-icon or arbitrary-margin unit tests were added.

Browser verification includes an automatic full expedition after one Start, separate developer
identities, teammate Ready/Change, Haste plans, coin commitments and timed outcomes, siege return,
revival from a living teammate, solo external rescue, reward equip/full-Bag replacement, shopping,
inventory, trials, reconnect and host/projector grids. All 31 browser flows passed: 29 in the
full regression run and two after updating obsolete pagination/chapter-count expectations.
Four combat/plan/presentation flows passed again after the final authored-move audit.
The final automatic run completed in 1.8 minutes at test speed; the final phone siege layout
uses compact crew contribution counts and expandable individual choices, with its browser flow passing.
Earlier failures exposed a real bounded-ID validation mismatch:
long generated Haste item IDs now fit the same 200-character limit as inventory commands.
The coin landing is carried by its presentation event, so feedback appears when that event plays,
while unrevealed outcomes/RNG remain absent from the projected exploration record.
Enemy move magnitudes and odds are now validated authored data in enemies.json. Only applicable
patterns are frozen on each encounter. Ordinary Guards use defense → strike → heavy, while the
Warden keeps defense → heavy → exposed strike; boss health uses its authored balance coefficient.

Screenshots inspected at 360×800, 667×375, 844×390, 768×1024 and 1366×768. Additional 360×640
recovery checks confirm a fallen student can scroll to request help and a living ally can reach
the confirmation footer. Populated four-member scenes retain build inspection and distinct
multi-enemy intent columns. Map browsing survives 50 snapshots and movement without recentering;
manual overview/detail mode is persisted. The scene remains mounted. Reduced motion suppresses
coin spinning while using the same authoritative reveal. The existing large Phaser chunk warning
remains. No human usability or classroom-duration acceptance is claimed by these browser checks.

## Focused real-client concurrency

Command: `npx.cmd tsx scripts/simulate-rewards.ts`. Sixty authenticated Socket.IO clients across
15 crews use atomic temporary saves and an injected server clock. ACK latency uses real elapsed
time. Workloads: claims/duplicate claims, result readiness, coins, trial votes/wagers/answers,
host skip, reconnects and combat plans. All 60 claims were unique and persisted; trial scores
and final claim/equipment records were consistent. There were no rejected requests.

| Measure | Median | p95 | Maximum |
|---|---:|---:|---:|
| 541 measured acknowledgments | 151.22 ms | 446.19 ms | 474.33 ms |
| Atomic saves | 1.30 ms | 12.18 ms | 114.52 ms |

Peak queue depth: 60. Workload elapsed time: 4.40 seconds. This is the latest local focused workload,
not a measured Cloudflare capacity limit or a replacement for the separate 128-client study.
No unrelated full-load suite was rerun for this pass.
The repeat ran alongside the fixed-seed simulation; the earlier isolated run measured p95
175.32 ms. The workload pins a coin node in its temporary room instead of assuming every random
map generates one. Both runs had zero rejected requests and consistent durable claims/scores.

## Fixed-seed progression comparison

Command: `npm run test:balance`. Twelve seeds for each of six solo classes and representative
crews of two, three and four: 108 runs, all extracted with two bosses defeated. Trials are
excluded from this simulation; safe projected-information bots choose routes and preparation.
The values below are strategy-dependent, not proof of class balance.

| Composition | Completed | Mean rescues | Combat net health loss / starting 48 HP | Final gold | Recorded reward base value / crew |
|---|---:|---:|---:|---:|---:|
| Solo Knight | 12/12 | 0.33 | 160.42% | 148.00 | 288 |
| Solo Healer | 12/12 | 0.42 | 162.50% | 139.00 | 288 |
| Solo Mage | 12/12 | 0.17 | 127.08% | 144.50 | 288 |
| Solo Thief | 12/12 | 0.50 | 206.25% | 162.75 | 288 |
| Solo Fighter | 12/12 | 0.42 | 152.08% | 131.50 | 292 |
| Solo Priest | 12/12 | 0.33 | 177.08% | 152.50 | 290 |
| Knight + Healer | 12/12 | 0 | 81.25% | 183.50 | 288 |
| Knight + Healer + Mage | 12/12 | 0 | 51.39% | 178.67 | 292 |
| Knight + Healer + Mage + Thief | 12/12 | 0 | 53.65% | 220.75 | 298 |

Health loss sums net decreases at each combat resolution, including healing offsets; repeated
encounters/recovery can exceed 100%. Reward base value is the simulation's 2P accepted-reward
counter, not the final inventory's sale value or a valuation of upgraded effects. Purchasing
spend per student divided by that student's power was 1.92–2.33 for solos, 2.29 for two members,
1.97 for three and 1.60 for four. All runs finished with zero remaining rescue debt. These are the
latest results after the authored Guard cycle was aligned with the teaching pattern.

The authored Fighter skill stress cost is now +2: its combined attack/defense must have a visible
cost. No class-specific enemy scaling was introduced. Mage took the least damage with this bot
strategy, and solo crews rescued more often than the selected coordinated teams. Human playtests
must check those differences, alternative builds/route choices, boss preparation, item usefulness
and the 35–45-minute target. Classroom reading time and independent high-load measurements remain
separate limitations. Browser automation cannot replace a new-player walkthrough.

---

The following sections are historical verification for earlier rule/UI versions.

# Verification · 2026-10-04

## Compact phone combat · 2026-10-05

Grouped crew/player identity, compact untimed/manual clocks, quieter inactive actions and an
outlined target selection. Portrait combat follows scene/content height rather than stretching
an empty decision body. Target/self context and reserved history utilities keep controls stable;
numeric effect previews retain touch/keyboard inspection and authenticated confirmation behavior.

Lint, Svelte/TypeScript and build passed. Four focused browser flows passed for teammate readiness,
editing/reveal, injury inspection, targeting and responsive combat. Solo/four-member walkthroughs
at the five required sizes show no horizontal overflow, reachable confirmation, persistent scenes
and no Attack-to-Block confirmation shift. Phone/landscape screenshots inspected. Existing Phaser
chunk warning remains; gameplay and server clocks are unchanged. No preview remains running.

## All-crew host/projector grid · 2026-10-05

Removed crew pagination and its styles. All crew tiles remain mounted in two columns, with
additional rows reached by normal vertical scrolling; widths up to 600px use one column.
Detail dialogs, host menus and separate map/log views are preserved.

Lint, Svelte/TypeScript and build passed (existing Phaser chunk warning). Two focused browser
flows passed: empty host lobby and all-crew host/projector grid, including resizing, persistent
canvas, log switching and detail dialogs. A separate in-memory 15-crew Chromium walkthrough
verified every tile, no paging controls or horizontal overflow, and last-crew detail access at
360x800, 667x375, 844x390, 768x1024 and 1366x768. Screenshots inspected. This is layout verification,
not a load/capacity measurement. Preview servers closed; ports 47831/3100 have no listeners.

## Week 5 mobile-game trial content

Installed content/learning/trials.reviewed.json with 18 distinct questions: Run Rules,
Hits & Rewards, Time & Feedback; two variants per 100/200/300 cell. Original hypothetical
mobile-game contexts state the needed rules and use checked slide references from the
50-slide MGD_5_week.pptx, including speaker notes. No Roblox or invented game bug claims.
Each question has four explained choices; the six 200-point questions include short traces.
Normal and developer rooms load the same bank. Only chapter 1/2 altars trigger questions;
no fight, seal, cache, shop, camp or arena trigger was added. Saved packs remain unchanged.

Lint, check and build passed (existing Phaser chunk-size warning). Sixty-six affected tests
passed, including actual classroom content loading, both boards without repetition across
all three categories, score normalization, solution privacy, restart preservation, host
controls and rejection of direct HTTP access to the answer bank. Two browser flows passed:
answer lock/reveal/return to board, and responsive map/question flow at all five supported
viewports. Portrait 360x800 and landscape 667x375 screenshots were visually inspected;
long scenario prompts use normal 14px interface text instead of heading-sized text.
No unrelated balance/load suite rerun; no preview left running. Human classroom difficulty
and reading-time validation remain outstanding.

## Dungeon v4: coherent UI and personal rewards

New matches use schema 9, dungeon-v4 and data/rules-v9. Earlier save directories are
untouched. The pinned dependencies, port 47831 and NodeNext `.js` imports remain.

Lint, TypeScript/Svelte checking, all 119 Vitest cases across 15 files and the production
build pass. All 27 browser scenarios were exercised. The initial full run passed 24;
the three failures were corrected and their affected flows rerun successfully. The latest
11-scenario run also passed after pending-feedback and larger-text changes. The complete
automatic expedition, ten separate developer identities and persistent Phaser scene passed.

The reference flow now retains a result decision after the final reveal. Personal equipment
offers can be equipped, kept, declined or deferred; unresolved offers survive default
readiness, host resolution, shared trials, save failure and restart. Tests check private
offers, deterministic retries, spirits, full backpacks, atomic swaps, changed-payload
request reuse and once-only grants. Ordinary victories explicitly show gold without an
equipment drop. Connected spirits count toward presence so treatment remains available.

The visual audit covers 360×800, 667×375, 844×390, 768×1024 and 1366×768: combat,
reward comparison, full-backpack replacement, inventory operations, selected shop stock,
treatment, trial reveal, recovery and host tiles. Long player/crew names and 18px control
text were additionally checked in real four-member crew sessions. Decision/dialog footers
remain reachable, and covered combat panels cannot intercept trial/map interaction.
Screenshots and measured reports are stored in ignored .Codex/ for development review.

Corrected issues found by this audit include a clipped host-tile footer, short-landscape
inventory operations, premature route-vote expectations, and enemy intent drawing over
trial answers. All four answer options now stay readable during reveal. Screens use the
shared control layer and focused layout styles; superseded global override files were removed.

### Focused 15-crew concurrency run

Sixty real Socket.IO clients claimed equipment and completed result readiness in a temporary
persisted room. The run measured 180 ACKs, including duplicate same-ID claims, and verified
60 claimed offers and consistent saved inventories. Zero requests were rejected.

| Metric | Median | p95 | Maximum |
|---|---:|---:|---:|
| ACK latency (ms) | 111.75 | 154.02 | 155.60 |
| Atomic save time (ms) | 1.67 | 5.97 | 34.87 |

Maximum observed queue depth was 60; measured claim/readiness time was 2.28 seconds.
This isolates the new mutations on local loopback; it does not replace the previous full-match
load measurements or establish Cloudflare/school-network capacity.

### Fixed-seed reward comparison

Twelve seeds across nine compositions produced 108 completed three-boss expeditions.
The same projected-information bot policy was used, with no class-specific enemy scaling
or combat balance changes in this pass. Each equipment drop has nominal crew value 24;
different route choices explain differences in total awarded value.

| Composition | Completion | Mean rescues | Mean reward value/crew | Final gold |
|---|---:|---:|---:|---:|
| Knight | 100% | 0.42 | 72 | 56.50 |
| Healer | 100% | 0.50 | 72 | 61.50 |
| Mage | 100% | 0.67 | 76 | 37.75 |
| Thief | 100% | 0.33 | 72 | 109.25 |
| Fighter | 100% | 1.33 | 84 | 22.00 |
| Priest | 100% | 0.58 | 72 | 64.75 |
| Knight / Healer | 100% | 0.83 | 80 | 58.00 |
| Knight / Healer / Mage | 100% | 3.00 | 76 | 42.00 |
| Knight / Healer / Mage / Thief | 100% | 2.67 | 74 | 55.50 |

These results demonstrate completion under this policy, not perfect balance. Thief gold,
Fighter rescue frequency and coordination in larger crews need human playtesting.

### Open acceptance items

A fresh-player walkthrough has not been performed. Human understanding, fun and classroom
pacing remain unverified. The Week 5 pack is now installed (see the content verification below);
its classroom difficulty still needs teacher playtesting. The earlier 128-client full-match p95 of 3542.97ms remains
above its 1500ms target; this focused UI/reward pass did not repeat unrelated full-load runs.
Historical v3 measurements below are retained with their original scope.

## Dungeon v3

New matches use schema 8, dungeon-v3 and data/rules-v8. Older saves remain untouched.
Independent crews complete three persisted chapter maps with once-only boss credit and rewards.
Builds, reserved shop budgets, rescue debt, private RNG and trial offers survive recovery.

Lint, TypeScript/Svelte checking, 110 Vitest cases across 13 files and production build pass.
All 19 browser scenarios pass, including a complete automatic expedition after one Start,
all ten developer identities, host/student/projector sessions, refresh, takeover, device
replacement, moderation, duels and the persistent arena. The final map icon/color change also
passed the focused responsive map/question scenario.

Rule coverage concentrates on outcomes: equal frozen budgets, cooldowns, seal overflow, shield
absorption, stress/injuries, deterministic odds, treatment, rescue, boss retries, inventory
ownership/capacity, once-only rewards and exact normalized trial scores. Restart tests preserve
all seven trial phases, budgets, RNG and accepted inputs without consuming offline time or
reapplying consequences. Existing receipts, queue limits, save-failure and authority tests remain.
Obsolete v2 pact/loot/mastery tests and arbitrary empty-panel width/depth assertions were removed.

## UI walkthrough

Screenshots inspected at 360×800, 667×375, 844×390, 768×1024 and 1366×768.
Combat, map, trial answers, host crew tiles and controls fit these sizes without horizontal overflow.
The map retains its scroll position through 50 snapshots and a movement update. The scene has a
visible height on portrait phones, stays mounted across phases, and uses grounded team-colored
characters. Character labels no longer overlap or collapse every Explorer into an identical name.

Enemy intent and action effects use icons/numbers with keyboard/touch inspection. Health, stress,
seal and shield are distinct indicators. Maps distinguish merchants, shrines, altars and arenas
with original icons and restrained category colors. Class buttons show silhouette, name and skill;
details are inspected separately. White surfaces and visible borders replace obsolete quiz shading.

A real client walkthrough purchased and equipped gear, inspected traits and injuries, displayed
overflow choices, and inspected wager/Blessing screens at all five sizes. Backpack uses Gear/Traits
tabs, three equipment slots and six backpack slots. Its fixed health/stress context and Done footer
remain reachable while the body scrolls, including short landscape phones. Operations are scoped to
the selected item. Numeric item descriptions correctly render 2P as 24 for a solo hero.

## Measured network runs

Real Socket.IO clients, temporary persisted rooms, atomic saves and an injected clock accelerate
phases after submissions. Each identity reconnects once; ACK delivery includes a 20ms delay.
The runs include route/combat/camp decisions, purchases/inventory and both complete wager trials.
Final snapshots compare bosses, completed-node counts and exact trial units across every client.
These are local Windows loopback measurements, not school Wi-Fi or tunnel capacity claims.

| Clients / crews | ACK median / p95 / max (ms) | Save median / p95 / max (ms) | Queue max | Run (s) |
|---|---:|---:|---:|---:|
| 32 / 8 | 251.43 / 380.43 / 424.17 | 31.93 / 104.18 / 139.34 | 32 | 39.78 |
| 60 / 15 | 600.96 / 970.85 / 1028.92 | 20.97 / 185.67 / 289.64 | 60 | 87.30 |
| 128 / 32 | 1789.97 / 3542.97 / 4146.78 | 3.79 / 425.80 / 678.76 | 128 | 269.25 |

Every run extracted all crews, acknowledged legal requests, reported zero rejected/failed requests,
and delivered consistent final scores. Each client reconnected once. The 128-client p95 **does not
meet the 1.5-second target**; capacity acceptance remains open. Investigation found a 31.1MB final
snapshot with 24,358 history events and 11,777 receipts. Atomic full-JSON save/serialization and
per-command draft copying need profiling before claiming the target; the size alone is not proof
of the entire regression's cause. The earlier optimized run reached 1173.48ms p95, but that result
must not substitute for this final rules run.

The original final-score assertion waited a fixed 150ms and failed at 128 clients despite completed
extraction. It now waits up to ten seconds for the committed revision and then compares actual
scores. Measured final delivery was 39.64 / 81.40 / 242.59ms for 32 / 60 / 128 clients. No server
state or score check was relaxed. Reports are written after each completed run so a subsequent
failure cannot discard earlier measurements.

## Seeded balance runs

Twelve seeds per composition; 108 complete expeditions. Projected-information bots choose safe
routes, supplies, treatment and recovery. Trials are disabled for this comparison. No class-specific
enemy scaling is applied. All six solo classes and the tested mixed crews completed all three bosses.

| Composition | Completion | Mean rescues | Combat HP loss / 48 | Final gold | Purchased power-units/member |
|---|---:|---:|---:|---:|---:|
| Knight | 100% | 0.75 | 422.92% | 37.25 | 6.17 |
| Physician | 100% | 0.67 | 452.08% | 43.00 | 6.83 |
| Occultist | 100% | 0.75 | 395.83% | 38.25 | 7.50 |
| Scavenger | 100% | 1.00 | 468.75% | 78.75 | 7.92 |
| Wanderer | 100% | 1.83 | 397.92% | 23.25 | 5.33 |
| Exorcist | 100% | 0.92 | 458.33% | 44.75 | 6.83 |
| Knight / Physician | 100% | 1.83 | 404.17% | 39.50 | 6.38 |
| Knight / Physician / Occultist | 100% | 3.25 | 401.39% | 38.00 | 5.64 |
| Knight / Physician / Occultist / Scavenger | 100% | 4.25 | 414.06% | 43.75 | 6.71 |

HP loss is accumulated net HP decrease during combat over the whole expedition, divided by the
starting 48 HP; healing/rescue makes values above 100% normal. This is not total incoming damage.
Purchased units sum price/hero power, then average per member; final gold is after spending/debt.

Two documented adjustments came from simulation: Skirmish has an authored +2 stress cost, and
failed bosses preserve already-dealt damage/phase progress. The latter prevents an injury/debt
softlock while keeping node rewards and Pilfer once-only. Bot behavior and rescue policy materially
affect these results. Higher rescue frequency in larger crews still needs human coordination testing;
these results establish completion, not a claim of perfect fairness or fun.

## Remaining classroom inputs

The installed Week 5 pack replaces development questions in new rooms. Its 18 original questions
use explicit mobile-game scenarios, four explained choices, and checked Week 5 slide references.
The complete lecture and notes were inspected; classroom difficulty and reading time still need
teacher playtesting. The old Week 4 bank is unused and existing rooms retain frozen content.

No human classroom, school-network or Cloudflare playtest has been performed. The 35–45-minute
duration and enjoyment target require an actual class session. Arena crews challenge one another
explicitly; waiting provides a consent-based NPC offer after 20 seconds. No maximum capacity is
advertised. Phaser remains a lazy-loaded renderer chunk (~361KB gzip).

Raw reports, screenshots and temporary audit scripts stay in ignored .Codex/ or test-results/;
application source never imports or serves them. Source .js imports are intentional NodeNext paths
to emitted JavaScript, verified by the compiled server and browser runs.

## Turn clarity correction — 2026-10-04

Selection is now explicitly a preview; Ready/Play turn commits it and Change removes readiness.
Crew orders remain visible, with per-member ready state and actor-correct numeric previews.
A server-timed Choose/Crew/Enemy/Outcome strip and reveal outcome panel explain progression.
Named effect chips expose condition penalties, Bleed damage/duration, equipment and Blessing uses.

Focused verification: lint, svelte-check/TypeScript and production build passed (existing Phaser
chunk warning remains). Fourteen independent-crew/network tests passed. Browser checks passed
for two-player readiness/edit/automatic reveal, five-device reconnect, all-ten-identity controls,
a complete automatic expedition, spirits/trials, duels and combat targeting. Five viewports were
checked; a first-screen phone overflow was fixed. Existing browser selectors now inspect the
visible crew order instead of the removed confirmed-action sentence. A scenario may already have
a bot-confirmed action; the manual-control test explicitly selects Change before replacing it.
Condition inspection and short-landscape controls were checked separately. No load/balance rerun
was needed for this presentation pass; the earlier content/performance acceptance gaps remain.

## Enemy readout and simple names — 2026-10-04

Enemy intent now follows the enemy's contained-canvas position, with icon/number above its head.
The player-caused broken-seal badge appears beneath it only from the presented seal-break event.
Touch inspection retains exact intent and status explanations. No new combat statuses or balance
changes. A shared display-name map simplifies classes/actions without changing saved IDs/assets;
class selection, hero inspectors, combat controls and new event messages use the same labels.

Lint, TypeScript/Svelte and build passed. Six focused browser scenarios passed: five-viewport
combat layout, live crew turn/seal-break flow, condition inspection, lobby selection, target
selection and all-ten-character developer controls. Existing Phaser chunk-size warning remains.

## Compact phone services and map — 2026-10-04

Stock uses three compact columns and original colored artwork. Selection and durable purchase
feedback occupy reserved regions; Buy stays in place before selection and after ACK. Inventory
More uses a popover; reward operation space remains reserved before selection. Primary actions
use dark teal; attack, healing, protection, stress and items share semantic colors.

Trading locations have distinct original merchant art. Camp focuses on rest/treatment/backpack
and hides Supplies. Server shop eligibility/economy and combat rules remain unchanged.
Larger map detail and Whole route retain 44px targets; Locate crew remains explicit. Fifty
snapshots and movement do not reset manual browsing. Tablet map clipping was corrected.

Lint, Svelte/TypeScript and build passed. Ten affected browser scenarios passed for combat,
host, map, stable shop purchase, inventory swap, reward overflow, spirit treatment and trial reveal.
Final overview checks verify node bounds on phone/tablet/desktop and route controls at five sizes.
Short-landscape treatment was corrected. Existing Phaser chunk warning remains. No new dependencies
or unrelated load/balance reruns. No preview server is left running.

Defense research uses unofficial versioned game-data references for
[Block](https://sts2.dev/keywords/block) and [Plating](https://sts2.dev/powers/plating-power).
Current seals disable modifiers; current shields persist. A defense conversion must update targets,
related equipment/Blessings, boss phases and persistence together. Boss difficulty and class
fairness remain unresolved by this presentation pass; earlier classroom/performance gaps remain.

## Revival continuation and map toggle — 2026-10-04

Paid revival previously restored the hero while keeping the crew eliminated. A later rescue failed
with no fallen heroes. Revival now restores crew activity; camp votes recover a stale current flag.
Rescue availability follows living heroes and obsolete local selections clear on context change.
An already-alive rescue request receives a typed actionable rejection. Map overview uses a visible
original SVG through the shared Button instead of the font glyph.

Lint, TypeScript/Svelte, build and 19 recovery/independent-server tests passed. Four browser scenarios
passed: paid solo revival, debt rescue, map overview and teammate treatment/trial reveal. Both solo
flows refresh at recovery, submit Retry, enter combat and resolve an attack without an extra recovery
charge. The wiped-party fixture is test-only. Existing Phaser build warning remains. Preview stopped.
