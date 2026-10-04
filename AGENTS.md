# Dungeon Crawlerlike

Use npm and the pinned lockfile. One package; no framework rewrite or dependency upgrades.

## Architecture

- `shared`: explicit domain unions, content, protocol, validation, palette and view contracts.
- `game`: pure deterministic rules. No sockets, files, clocks, UUIDs or Math.random.
- `server`: identity, ownership, receipts, per-room queue, deadlines, persistence and moderation.
- `client`: scoped PlayerController/HostController, Svelte input and timed presentation.
- `client/arena`: persistent Phaser renderer; never change authoritative phases.

Crew progression is canonical in `MatchState.crewProgress`. Server run records own clocks,
readiness and pause reasons; their progress accessors bind to canonical state. Do not disguise
one crew as a whole match and merge global fields back. `.js` imports are intentional NodeNext
imports of emitted JavaScript. Keep focused functions; comments explain surprising intent in
one short sentence. No generic effects engine, message bus or singleton player socket.

Combat UI: selection is a local preview; Ready commits, Change calls decision:edit. Solo uses
Play turn. Show scoped crew actions/readiness persistently, never rival private inputs. Keep the
server-timed Choose/Crew/Enemy/Outcome strip and reveal outcome panel. Derive effect badges from
the presented hero, not the already-resolved snapshot. Teammate previews use that actor's power.
Timer offsets belong to the supplied view/session. Manual test timing must be explicitly labelled.

## Rules

Schema 9 / dungeon-v4 / data/rules-v9. Never migrate or modify older save directories.
Three persisted chapter maps, seven authored rows each. Independent crews of 1–4; no crew cap.
Unique crew symbols; palette colors can repeat. One hero per student. Frozen power 12/6/4/3
never changes after deaths, disconnects or revival. Six classes are legal for every crew size.

Attack, Brace, consumable or signature skill; signature cooldown two turns. No Loot or banking.
Enemy health, seal and shield are separate. Seal overflow reaches the body. Boss phase seals
activate at the next turn boundary, once per threshold. Ordinary/elite limit four turns; bosses
six. Failed bosses retain damage and phase progress on retry; no once-only reward resets.

Stress bands apply at action lock. Ten stress causes one panic per resolution, then six stress
and an Affliction. Injuries require actual health damage; rolls and disclosed odds agree.
Skirmish's authored +2 stress cost is a documented simulation adjustment. Blessings/Afflictions
have two slots each; duplicates upgrade or apply their specified consequence, never silently
replace another trait. Second Breath consumption survives replacement, death and revival.

Weapon/armor/charm, six backpack slots, stack limit three. Overflow requires Keep/Replace/Leave.
Gold and rescue debt belong to the crew. Effects/prices scale by power. Shop stock and individual
allowances freeze on arrival; repeat recovery Rest must not replenish stock or allowances.
Revival preserves builds; full rescue loses half available gold and adds 24 debt. Rewards repay
debt first. Boss credit, node rewards, Pilfer and arena rewards cannot be farmed on retries.

Ranking: bosses defeated, furthest completed chapter/row, exact trial points. Gold never scores.
Exactly two shared Trials of Wagers at chapter 1/2 altars. Freeze at safe boundaries after reveals.
Three questions, one per value band; one class vote per crew. Individual final stakes/answers.
Score units use denominator 12 and the frozen roster including spirits. Solutions stay private
until reveal. Blessing offers freeze and grant once. Normal trials require a reviewed 18-question
pack; development fixtures are test-only. No obsolete inscription/pact/equipment-charge flow.

Arena nodes only: consent, one physical duel per crew, three nonlethal exchanges. Dungeon item,
condition and class effects are suspended. Resolved health loss remains. Waiting offers an NPC
champion after 20 seconds; never start a fight because two crews occupy an ordinary room.

## Network and durability

Authenticate then synchronize before input. No offline action buffering. Preserve same-ID
retries, reject changed payload reuse, validate owned hero and active crew/trial phase/deadline.
ACK only after durable save. A phase resolves once. Failed saves preserve committed state and
pause only that room. Queue cap 512; duplicate receipts bypass new mutation rate charges.
Read-only tabs cannot keep an identity present. Explicit takeover controls the same hero.

Pause reasons compose: room, crew, offline, trial and duel. Host absence has a 90-second grace,
then preserved pause; reconnect does not resume. Restart restores live schema-9 rooms paused,
using savedAt rather than offline elapsed time. Preserve RNG, inputs, receipts, budgets, rewards
and boss thresholds; never reconstruct them by rerunning effects. End leaves results readable.

Mutable drafts clone heroes, crews, encounters, inputs and clocks. Frozen content/maps,
presentation-start records and event payloads are immutable and can share references. Copy
arrays before appending; never mutate an old event. Public projections omit future questions,
solutions, private inputs/offers/backpacks, RNG and credentials. Host recovery remains private;
ordinary hosting is one click, with no installation key.

## Presentation and verification

White surfaces, visible borders, spacing 4/8/12/16/24/32, 44px touch targets. Team colors identify
crew clothing/badges/paths. Short action labels; effects adjacent, details on inspection. Bits UI
owns dialog/popover accessibility; Sonner reports rejected commands. Normal events use the log.
Keep the arena mounted across maps, trials, inventory and results. Display health/conditions/gold
at presentation events; reconnect seeks server time. Map browsing must not reset on snapshots,
movement or resize. Dialog body scrolls; footer remains reachable with safe-area padding.
GameIcon owns the original item/stat/condition SVG vocabulary. Item tiles show an icon and short
name; selected-item operations live in ItemActions. EnemyIntent and ActionPreview show numeric
effects with inspection; actionEffects supplies the same values used by accessible action labels.
Inventory is split into Gear and Traits tabs. Keep health/stress in the fixed dialog context.
Use itemDescription for numeric effects; replacing only P incorrectly renders 2P as 212.
Map category colors live in palette.ts; crew colors remain on identity/markers/selected paths.

Default port 47831. Commands: npm run dev; npm.cmd run dev -- --test; npm.cmd run dev -- --test
--port 3001; npm run lint; npm run check; npm test; npm run build; npm.cmd start -- --test;
npm run test:e2e; npm run test:load; npm run test:balance. `npm test` is automated; `--test` is
interactive. Development uses tsx watch; production runs compiled JavaScript.

Ten independent developer identities: crew sizes 1/2/3/4, Auto/Manual, scenarios and reconnect.
Bots use projected information and real Socket.IO commands. Test state stays in memory; normal
startup exposes no test endpoints. Reject test mode on a non-loopback bind.

Temporary plans/results belong in ignored `.Codex/` and `test-results/`, never application code.
Update README and docs/verification.md with actual results. Preserve user edits, course materials,
other projects, existing backups, hosting configuration and all older runtime saves.

Use shared/display-names.ts for player-facing class/action names; keep persisted IDs unchanged.
Class icons use CLASS_SKILLS IDs, never the lowercase display label. EnemyIntent anchors to the
same contained 1200x580 canvas coordinates as DungeonScene. Applied enemy statuses use presented
state, not final snapshots. Currently Seal broken is the only lasting player-applied enemy status;
do not depict damage skills as fictional poison/stun/debuffs.

## Coherent UI and equipment results

Use components/ui for equivalent controls, containers, stats, item details and decision footers.
44px controls / 48px primary decisions; 14px text / 16px values / 20–24px headings. Use spacing
tokens, white surfaces, visible neutral borders, team identity colors and consistent focus/hover.
Do not append global corrective overrides or style equivalent controls separately per screen.
Screens own layout; Bits UI owns accessible dialogs/popovers/tabs; Sonner owns rejected requests.
GameIcon owns the original SVG vocabulary. Inspect numeric effects by touch/keyboard, not hover only.

ActionPanel keeps CrewStage/Phaser mounted and renders exactly one active interaction panel.
Local action selection is not a submission. Scope child decisions by authenticated player identity.
The decision body scrolls; essential action numbers and confirmation stay in its fixed footer.
Inventory operations also stay in the dialog footer; selected-item details scroll in the body.
StopPanel opens exactly one service; Supplies/Treatment transactions are individual, Rest/Leave
are crew votes. Inventory and shopping lock after readiness until decision:edit reopens them.
Preserve native [hidden]. Never display final health/conditions before their presentation events.

CrewProgress has a persisted result and Last turn summary. Result readiness/clocks stay in server
run records. Combat recap lasts three seconds; results wait for all registered crew members.
Fallback defaults off; enabled results use 60 seconds. Existing 15-second absence defaults defer
pending rewards; all-offline crews suspend. A connected spirit is present even if unable to vote.
Trials freeze/restore results without rerunning combat, rewards or transactions.

Cache/elite/boss rewards: one private two-option equipment offer per registered hero, including
spirits; ordinary victory is gold only. Private persisted reward RNG generates offers once.
Claims enforce owner, phase, inventory revision, capacity and durable receipts. Equip atomically
stores replaced gear; full bags require explicit replacement. Deferred offers stay accessible at
safe decisions; result readiness never consumes an offer or grants equipment. Public/host views
exclude unselected options and reward RNG. No farming, new rarity system or altered combat balance.

ItemArtwork owns original colored item geometry; GameIcon retains stats/conditions. Use GAME_COLORS
for semantic colors. Shop details/receipt/confirmation reserve stable regions; only stock scrolls.
Short landscape places stock beside inspection/confirmation. Camp hides Supplies in its menu;
server purchasing rules remain unchanged. Map overview retains 44px targets and no tablet height
cap; never reset browsing on snapshots/resize. Enemy seal is still a modifier target, not Block.

Revival must restore both hero life and crew active status. Camp rescue availability derives from
living members; legal camp votes reconcile an old stale eliminated flag. Reset local camp selection
on identity/phase/rescue-state change, not every snapshot. Test-only rescue fixture covers a wiped
crew's paid revival and debt rescue through retry; phase readiness never repeats the rescue cost.

Structured reward/result/transaction records are created at resolution, not inferred from client
diffs. Show confirmed destinations and actual amounts only after ACK; failures retain selection.
Test-only gallery and reward/full-backpack/result fixtures contain realistic populated states.
Focused reward integrity/recovery/browser checks and the 15-crew concurrent claim script protect
this flow. Avoid margin/icon tests or unrelated full-load reruns for simple visual edits.
