# Verification · 2026-10-04

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
pacing remain unverified. The reviewed 18-question lecture pack is still missing; production
trial content stays unavailable. The earlier 128-client full-match p95 of 3542.97ms remains
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

The 18 development questions are clearly labelled fixtures. Production trials remain disabled until
a reviewed pack supplies verified lecture references and two variants per category/value cell.
No invented slide citations or silently reused v2 questions are presented as reviewed material.

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
