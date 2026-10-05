# Dungeon Crawlerlike — player feature table

Schema 10 / dungeon-v5. Two chapters, twelve rows each. One character per student; crews progress independently.
Gold buys builds/recovery, while bosses → completed progress → normalized trial points decide ranking.

| Feature / map type | What the player can do / choose | What cannot happen | Visible outcome / host observation |
|---|---|---|---|
| Lobby and crew | Join/create a crew of 1–4; individually choose one of six classes | Change membership/classes/power after Start | Crew symbol, members, class purpose; host starts |
| Independent progression | Travel/fight with own crew while other crews progress | Control another member or encounter by ordinary map overlap | Crew tile shows chapter/row/phase |
| Map and routes | Browse vertical paths, inspect reachable nodes, vote; Locate crew | Vote for disconnected/future node; snapshots recenter scrolling | Crew votes/selected destination and node tradeoff |
| Ordinary battle | Choose one action and enemy/ally target; defeat or escape | Generic Seal, hidden hit chance, repeat victory farming | Health/Block/intents/effects; personal reward on first victory |
| Teaching battles | Learn attack, intent, protection and Block through actual fights | Boss-only introduction of basic defenses | Short contextual cue; same rules as later fights |
| Elite node | Choose harder composition for more gold and build reward | Better rewards without disclosed danger | Elite label, actual move/health/reward |
| Boss node | Prepare, defeat phased boss, retry after recovery | Advance chapter merely by entering/escaping | Boss credit, equipment choice, chapter transition |
| Multiple enemies | Select dangerous/support target; see all intents | Unannounced retargeting or per-enemy multiplication of total health budget | Individual health/Block; inspect the support recipient in intent |
| Health and Block | Damage consumes Block then health; prepare during defensive turns | Attack a separate Seal; indefinite ordinary Block | Numeric Block with expiry, actual blocked/HP damage |
| Basic Attack | Deal actual previewed damage to chosen enemy | Target dead/nonexistent enemy or rival hero | Attack effect and target HP/Block change |
| Basic Block | Gain personal protection and reduce stress | Treat protection as guaranteed healing | Block amount/duration, actual absorbed damage |
| Knight / Protect | Protect self or living same-crew ally | Resurrect, protect rival, ignore cooldown | Recipient and this-turn Block |
| Healer / Heal | Restore living ally/self health and remove Bleed | Revive a dead target | Actual restored health and cleared Bleed |
| Mage / Blast | Damage, Mark setup, accept stress cost | Consume its own newly created Mark with that same action | Mark source/bonus/duration and combo recipient |
| Thief / Steal | Damage and take node-limited gold | Farm gold through retries or repeated cooldown uses | Gold earned / already taken |
| Fighter / Hit & Block | Damage plus personal protection; pay stress | Free unrestricted second action | Damage/Block/stress breakdown |
| Priest / Drain | Damage, heal living self and reduce stress | Return from death by Drain | Three actual effects |
| Cooldowns | Inspect ready turn and choose another move | Use signature twice in a turn or before ready | Ready on turn N |
| Mark combo | Coordinate a follow-up damaging action | Stack infinite Marks, spend one Mark per cosmetic hit | Added/consumed/expired icon and bonus |
| Haste Charm | Activate once/fight for a second slot; rank II also gives P Block | Third action, recurring activation, spirit/arena use, swap-reset | Two plan slots and spent/ready use |
| Ready / Change | Commit complete plan; reopen before lock | Resolve a half-submitted plan; edit after lock | Teammate actions/targets and remaining readiness |
| Reveal / Last turn | Watch batched effects; inspect summary afterward | Premature final stats or required animation ACK | Actual blocks, damage, combo, cancelled attack, death |
| Withdrawal | Living members vote; majority escapes with stress | Dead members force withdrawal; bypass panic at nine stress | Withdrawn result, no victory reward |
| Stress / panic | Manage stress with Block/heal items/rest | Randomly lose chosen action; hidden panic threshold | Band penalty, stress change, panic and curse |
| Injuries | Inspect/treat arm/leg injury | Injury from a completely blocked attack; unlimited duplicate stacking | Disclosed odds and persistent injury icon |
| Blessings | Choose/upgrade/replace within two slots | Infinite slots or reset spent Second Breath | Rank, trigger and ready/used status under health |
| Iron Nerve / Calm Charm | Prevent the first disclosed stress amount each fight | Reset spent protection by swapping/reconnecting | Prevented stress and used indicator |
| Opener | First damaging action receives rank-scaled bonus | Seal targeting or bonus on every hit/tick | First-action damage bonus |
| Last Stand | Earn automatic next-turn Block on the first alive below-half crossing | Discard the bonus before any protective turn; revive from zero | Next turn protection indicator and actual absorption |
| Field Medic / Healer Charm | Boost the first actual heal | Consume on zero healing or resurrect | Actual boosted health and spent use |
| Clear Purpose | First Block removes additional stress | Trigger on every repeated Block | Stress removed and used indicator |
| Curses / Afflictions | Inspect/treat lasting drawbacks | Silent replacement or unrelated teammate penalty | Named effect and treatment price |
| Shaken / Doubtful | Manage extra stress on first damaging hit / reduced first action damage | Unannounced action replacement | Exact trigger and remaining use |
| Brittle / Haunted | Manage weaker received Block / weaker Rest stress relief | Hidden protection/rest preview | Actual reduced value and treatment |
| Second Breath | Survive one lethal event if unused | Revive an already-dead hero or reset by recovery | Explicit death-prevented feedback |
| Victory reward | Personally Equip/Store/Upgrade/Leave one of two options before travel | Defer manually, reroll, claim both, grant twice, silently discard owned gear | Exact item/rank/effect/destination |
| Fully developed gear | Choose a useful consumable bundle when gear upgrades are exhausted | Forced meaningless duplicate equipment | Frozen bundle contents and explicit space choice |
| Equipment and ranks | Use one weapon/armor/charm; upgrade to II | Rank III, duplicate-slot stacking, free implicit upgrades | Build comparison and effect |
| Blade / Piercing Blade | Choose extra direct damage / ignore an amount of Block | Bonus each visual hit; piercing grants extra damage | Weapon effect and exact comparison |
| Guard Coat / Ward Vest | Choose stronger personal Block / first-hit mitigation | Unlimited mitigation or indefinite ordinary Block | Actual prevention and spent state |
| Bag / backpack | Inspect six slots, select item, use legal consumable or safe operation | Hidden bag control or combat gear transfers/swaps | Labelled Bag occupancy, item details |
| Overflow | Choose what to replace or leave the reward | Defer manually or silently destroy previous equipped item | Explicit space decision |
| Consumables | Heal living target, clear Bleed, calm; spend an action | Resurrect, consume same stack twice, use two items per turn | Preview, actual use/count and destination |
| Gold and budgets | Buy gear, upgrade, treat, revive or wager within rules | Spend another personal reserve or directly buy ranking points | Crew wallet, Your budget, confirmed cost |
| Rescue debt | Recover now and repay from future rewards | Hide repayment or farm debt-free recovery | Gross reward/debt repaid/net gold |
| Merchant node | Shop/upgrade/treat/revive; Ready to leave | Free Rest or reroll stock on refresh | Compact stock, comparison, stable operation footer |
| Camp node | Once-only Rest, treatment/ally revival, Bag, Leave | Shop equipment or repeat free Rest | Distinct camp art; actual recovered stats |
| Shrine node | Choose one health/stress recovery; revive ally | Disguised merchant or repeated free recovery | Clear shrine choice and effect |
| Cache node | Receive gold and personal frozen equipment choice | Repeat opening for more rewards | Opened chest, gold and actual item choice |
| Exploration event node | Inspect odds and make one eligible personal choice or Leave | Hidden chance, refresh reroll, mandatory gamble | Personal commitment and resolved result |
| Coin fountain | Choose side/prize, stake P gold, toss once or Leave | Mislabel a biased roll 50/50; undo after learning outcome | Actor/side/stake/landing/prize visible to host |
| Trapped cache | Take disclosed 75%/65% risk or Leave | Undisclosed injury/odds or spirit physical risk | Gold or arm injury |
| Sacrificial altar | Living player pays P health for an equipment choice | Sacrifice to death or repeat reward | Exact health cost and guaranteed offer |
| Quiet shrine event | Restore health or stress once, or Leave | Risk roll where none exists | Immediate clear recovery |
| Fallen spirit | Ward a living crew member, answer trials, inspect/claim build rewards, request help | Attack, cast self-revive, activate equipment while dead, route vote | Fallen identity, ally support and recovery request |
| Ally revival | Living teammate selects fallen ally; gold or disclosed debt at safe recovery | Midfight/self/rival revive; duplicate charge | Named Revive control, actor/target/cost/returned stats |
| Full-party / solo rescue | Call external rescue through recovery decision | Permanent exclusion or pretending dead hero casts resurrection | Half-gold loss, debt, revived crew |
| Failed-encounter recovery | Review defeat, treat/revive, Ready to Retry; ordinary retreat permitted | Restart on hidden stale camp choice; failed boss advances | Recovery scene, unfinished encounter/retry shown separately |
| Trial checkpoint node | Trigger scheduled trial once, then continue | Surprise repeat quiz or checkpoint shopping | Trigger crew/event and completed marker |
| Trial tile voting | Vote category/band; see crew choices and class aggregate | Fastest click wins; large crew gets extra class votes | Badges/counts and winning/tie explanation |
| Trial wager / answer | Personally commit stake, answer privately once | Early solution exposure, revise accepted answer | Public stakes; private answer until marked reveal |
| Trial score / gold / Blessing | Earn normalized exact points, crew gold and one eligible trait choice | Speed or living count changes denominator; duplicate gold settlement | Crew accuracy/points, earned gold/debt repayment and frozen trait offers |
| Shared siege node | Coordinate Attack/Protection/Supply over three rounds; spirits Supply | Normal dungeon damage farming or speed-based rewards | Class meters, crew roles, success/failure and restore |
| Arena node | Voluntary same-chapter arena duel or NPC after wait | Surprise combat, merchant target, forced participation | Clear consent, suspended effects and partner status |
| Physical duel | Strike/Guard/Feint for three nonlethal exchanges | Death, Haste/dungeon effects, repeat arena farming | Actual health loss, result/rewards, restored build |
| Shared interruption | Participate, then return to exact prior decision/reveal | Replay purchases/damage/rewards or hide trial behind duel | Paused context strip and resumed remaining time |
| Host observation | Inspect public hero build, watch votes/stakes/coins/reveals, filter crews | Read future solutions/private answers/options/backpacks | All-crew grid and compact activity timeline |
| Host moderation | Pause/resume, permitted extend/defaults, cancel duel, skip event, recover device, End | Arbitrary stat/gold editing, resurrection or production impersonation | Once-only audited interventions |
| Connection and restart | Resume own identity and confirmed decisions | Offline buffered actions or duplicate committed effects | Synchronizing/pause/error status with preserved progress |
| Final ranking | Compare bosses (0–2), completed progress, exact trial points | Gold/kill/spirit points or unearned survival multiplier | Shared victory when all criteria tie |
| Finished crew | Inspect build, standings and pending shared events | Farm extra encounters/gold after extraction | Extracted state and final build |
| Developer mode | Control all ten authenticated identities, bots/manual, focused fixtures | Test endpoints in classroom mode or tokens in URLs | Same gameplay commands and visible debugging |

