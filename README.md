# Dungeon Crawlerlike

## Start

1. In the project folder, using Node 24:

   ```powershell
   npm ci
   npm run dev
   ```

2. Open **http://localhost:47831** → **Host a match**. Students join a crew and choose a class; press **Start expedition**.
3. For remote students, run `cloudflared tunnel --url http://localhost:47831` in a second terminal and share its HTTPS address. Stop the server with **Ctrl+C**.

## Game mechanics

| Mechanic / location | What you do or receive | Limits / consequences |
|---|---|---|
| **Goal and ranking** | Finish two chapters; ranking compares bosses defeated → completed chapter/room → trial points. | Gold is spending money, not score. Exact ties share victory; host may end early. |
| **Crews** | 1–4 students, one character each; crews explore independently. | No fixed crew limit. Membership and classes lock when the host starts. |
| **Power (`P`)** | Per-hero power is 12 / 6 / 4 / 3 for crews of 1 / 2 / 3 / 4. Start at `4P` health and `2P` Attack; each crew totals 48 health and 24 damage. | Death, disconnects and revival never rescale power. Effects and prices below use this frozen value. |
| **Chapter maps** | Two saved maps, 12 rows each; choose connected routes through battles, services, events and a boss. | Map overlap never starts PvP. Both maps stay fixed after Start. |
| **Route voting** | Inspect a reachable node, select it, then Ready to travel. Locate crew returns to your position. | Crew votes decide the destination; you cannot select an unconnected room. Browsing survives updates. |
| **Opening battles** | Chapter 1 starts with a Raider, then a Guard, teaching attacks, intent and Block. | Real combat and rewards, not a separate tutorial mode. |
| **Ordinary battle** | Defeat the enemies for 12 crew gold and a personal equipment choice. | Four turns; timeout forces escape. No victory reward for escape or defeat. |
| **Elite battle** | Choose a harder enemy group for 24 crew gold and personal equipment choices. | Five turns. Rewards only on first victory. |
| **Chapter bosses** | Iron Warden, then Hollow Regent; win for 36 crew gold, equipment and permanent boss credit. | Eight turns per attempt. Bosses change phase at health thresholds; they must be defeated to advance. |
| **Enemy patterns** | Raiders attack; Guards alternate defense and blows; Whisperers pressure stress; Supporters aid enemies; Devourers pressure wounds/Bleed. | Inspect each enemy's actual next move and recipient; a group shares one starting strength budget. |
| **Enemy intent** | Icons above each enemy show planned damage, targets, Block and conditions. | Damage shown is before your protection. Killing that enemy cancels its attack. |
| **Health + Block** | Incoming damage spends Block first, then health. Blue Block below HP shows remaining protection. | No Seal or separate weak point. Hero Block clears at next player-turn start; enemy Block expires after the next player phase. |
| **Attack** | Deal `2P` base damage to one living enemy. | Gear, stress, injuries and combos adjust the preview; enemy Block can absorb it. |
| **Block** | Gain `2P` personal Block and remove 1 stress. | Protection lasts this turn; it does not restore health. |
| **Knight — Protect** | Give yourself or a living crew ally `3P` Block this turn. | No healing or revival. |
| **Healer — Heal** | Heal yourself or a living ally by `2P`; remove Bleed. | Cannot heal beyond maximum HP or revive a spirit. |
| **Mage — Blast** | Deal `2P` base damage, apply Mark and gain 2 stress. | The same action cannot consume its newly applied Mark. |
| **Thief — Steal** | Deal `P` base damage and gain `P` crew gold. | Gold is granted once per hero per node; cooldown reuse and retries cannot farm it. |
| **Fighter — Hit & Block** | Deal `2P` base damage, gain `P` personal Block and 2 stress. | This is one combined action, not two free actions. |
| **Priest — Drain** | Deal `P` base damage, heal yourself by `P` and remove 1 stress. | Only a living Priest can use it; no resurrection. |
| **Skill cooldowns** | A signature used on turn 1 becomes available on turn 3. | Reset between encounter attempts; at most one signature per turn, even with Haste. |
| **Mark combo** | The next eligible hit gains the marking Mage's `P` bonus; coordinate a follow-up action. | Marks do not stack. Unused Mark expires after next-turn player actions. |
| **Haste Charm** | Once per fight attempt, activate two ordered action slots. Rank II also grants `P` Block. | Normally one action. Never a third; at most one skill and one consumable. No spirit/arena use or swap reset. |
| **Ready / Play turn / Change** | Selection is a preview. Ready commits a crew member's plan; Play turn commits a solo plan. Change reopens it before lock. | The last required Ready advances play. Confirmed teammate actions and targets are visible. |
| **Turn reveal / Last turn** | Follow Choose → Crew → Enemy → Outcome; inspect damage, healing, cancelled attacks and protection sources afterward. | No animation click is required to advance; Last turn retains the explanation. |
| **Withdrawal** | Living crew members vote to escape. | Requires a majority; adds stress and gives no victory reward. Spirits do not decide withdrawal. |
| **Stress** | 0–3: normal damage; 4–6: −10%; 7–9: −20%, with worse trapped-cache odds. | Penalty uses stress at action lock; it never randomly replaces your chosen action. |
| **Panic** | At 10 stress, lose `P` health, reset to 6 stress and gain an Affliction. | At most once per resolution; panic can be lethal. Trait-cap consequences may leave stress above 6. |
| **Bleed** | Take the displayed damage for its remaining duration; clear it with Heal or a Bandage. | A temporary combat condition, distinct from persistent injuries and curses. |
| **Arm / leg injuries** | Arm: −25% outgoing damage. Leg: −25% Block-action protection. Treat the chosen injury. | Enemy injury rolls require actual HP damage; odds are disclosed. One of each; a duplicate adds 2 stress. |
| **Blessing slots and ranks** | Keep two lasting Blessings, upgrade duplicates, or explicitly replace/decline a new one. | Ranks I/II only. Gear, death and revival do not reset spent expedition uses. |
| **Iron Nerve** | Prevent the first 1 / 2 stress gained per fight at rank I / II. | Once per fight attempt. |
| **Opener** | First damaging action gains `P` / `2P` damage. | Not an extra bonus on every hit. |
| **Last Stand** | First living drop below half health reserves `P` / `2P` Block for the next turn. | Once per fight attempt; does not revive from zero. |
| **Field Medic** | First actual heal gains `P` / `2P` healing. | Does not consume its use on zero healing or revive a dead target. |
| **Clear Purpose** | First Block removes 1 / 2 additional stress. | Once per fight attempt. |
| **Second Breath** | Once per expedition, survive lethal damage at 1 HP / `P` HP. | Death prevention, not resurrection; revival/replacement does not restore its use. |
| **Affliction slots** | Inspect and treat up to two lasting curses. | Duplicate curses or gaining one at capacity adds 3 stress instead of replacing a curse. |
| **Shaken / Doubtful** | Shaken: first damaging enemy hit adds 1 stress. Doubtful: first damaging action loses `P` damage. | Triggers reset per encounter attempt. |
| **Brittle / Haunted** | Brittle: received Block is 25% weaker. Haunted: Rest removes 1 less stress. | Treatment removes the chosen curse; ordinary revival does not. |
| **Build inspection** | Tap character effects or a crew portrait; Bag has Gear and Traits tabs. Host can inspect public builds. | Private inventories and unselected reward offers remain private. |
| **Victory / cache rewards** | Each registered hero, including spirits, chooses one of two frozen options: Equip, Store in Bag, Upgrade or Leave. | Decide before manually readying travel; no Decide later. Refresh does not reroll or grant twice. |
| **Reward results** | Review outcome, gold, debt repayment and character changes, then Ready to travel. | Each member has separate readiness. Closing the chooser is not a decision; reopen Choose reward. |
| **Fully upgraded build** | When gear choices are exhausted, receive useful consumable-bundle options. | Still choose one option; make Bag space explicitly. |
| **Equipment / upgrades** | One weapon, armor and charm; rank I gear costs `2P`. Eligible merchant upgrades to II cost `P`. | Rank II generally doubles the listed gear bonus; no rank III or duplicate-slot stacking. |
| **Blade / Piercing blade** | Blade adds `P` / `2P` direct damage; Piercing blade ignores `P` / `2P` enemy Block per attack. | Piercing bypasses protection; it does not add damage. |
| **Guard coat / Ward vest** | Coat adds `P` / `2P` when choosing Block. Vest absorbs up to `P` / `2P` on the first enemy hit reaching it. | Coat is not passive healing. Vest is once per fight attempt, not every hit; logs name actual absorption. |
| **Calm charm / Healer charm** | Calm prevents the first 1 / 2 stress; Healer boosts the first actual heal by `P` / `2P`. | Uses reset per fight attempt; swapping/reconnecting does not replenish them. |
| **Bag / equipment swaps** | Six backpack slots; consumables stack to three. Equip moves the displaced gear into Bag; Unequip returns gear there. | Gear operations only at open safe decisions, never combat/trials/duels. Unequip needs space; Ready locks editing until Change. |
| **Transfer / sell** | Transfer a Bag item to a same-crew hero with space; sell Bag items at a merchant. | No transfers during combat or to rival crews. Selling returns gold to the shared wallet. |
| **Full Bag / overflow** | Explicitly replace an owned Bag item, make space, or leave the reward. | No silent destruction of displaced gear. Automatic absence/host handling preserves unclaimed rewards. |
| **Healing draught / Bandage** | Draught heals a living target by `2 × target P`; Bandage heals `target P` and removes Bleed. Each costs owner `P`. | Uses your combat action and consumes one item; healing bonuses may apply. No revival. |
| **Calming tonic / Splint** | Tonic removes 3 stress, costs `P`; Splint removes one chosen injury outside combat, costs `2P`. | Splint cannot be used midfight. Tonic uses a combat action. |
| **Gold / personal budget** | Start with 24 crew gold. A visit reserves each hero `floor(entry gold × P / 12)` as Your budget. | Purchases/treatment cannot spend another hero's reserve; gold is not ranking score. Trials wager consequences are not gold stakes. |
| **Rescue debt** | Future gold first repays outstanding debt; results show earned gold and repayment. | Debt repayment can leave no spendable gold from a reward. |
| **Merchant node** | Buy supplies/gear, upgrade, sell, treat or revive; Ready to leave when finished. | Stock and budgets freeze on arrival. No free Rest; refresh cannot reroll the shop. |
| **Camp node** | Rest once: living heroes heal `2P` and lose 2 stress; also treat, revive, inspect Bag or Leave. | No equipment shop. Haunted removes only 1 stress; no unlimited free Rest. |
| **Treatment** | Pay `P` to heal `2P` or remove 3 stress; pay `2P` to remove a chosen injury or curse. | Individual confirmed transaction from Your budget; not a crew Rest vote. |
| **Cache / Treasure node** | Receive 12 crew gold and a personal equipment choice for every registered hero. | Once per node; no fight or question required. |
| **Mystery / exploration node** | Inspect the event's odds/costs; each hero commits an eligible personal choice or Leave. | No hidden reroll on refresh; commitment cannot be undone after seeing the result. |
| **Coin fountain** | Stake `P` gold, choose Heads/Tails and gold/Blessing. Fair 50/50: success returns `2P` gold or a rank-I Blessing offer. | Failure loses the stake and adds 1 stress. Spirits may play; host sees choices, stakes and landings. |
| **Trapped cache** | Risk for `2P` gold, or Leave. Success: 75%, dropping to 65% at stress 7+. | Failure causes an arm injury. Spirits cannot take the physical risk. |
| **Sacrificial altar** | Pay `P` health for a guaranteed personal equipment offer, or Leave. | Must be living and remain above zero HP; no repeated reward. |
| **Quiet shrine event** | Choose heal `2P`, remove 3 stress, or Leave. | One personal recovery; no chance roll. |
| **Recovery shrine node** | Supported safe recovery location with treatment/ally revival. | Not placed on the current two chapter maps; the Quiet shrine event is the shrine players currently encounter. |
| **Fallen spirit** | Ward a living ally, answer trials, claim build rewards, Supply in siege, or Request revival. | Cannot attack, self-revive or activate gear effects. Ward is capped at the recipient's `P`, even with multiple spirits. |
| **Ally revival** | A living teammate selects a spirit at camp/merchant/shrine, postfight result or failed-fight recovery; pay `2 × target P`. | No midfight/self/rival revive. If gold is insufficient, choose that amount as debt. Returns half HP and at least 3 stress; build stays. |
| **Full-party / solo rescue** | A fully fallen crew accepts external rescue: halve available gold, add 24 debt, restore half HP and at least 3 stress. | Not a dead character casting resurrection. Injuries, curses, equipment and spent expedition uses remain. |
| **Retry / failed encounter** | Recover, then Retry; nonboss recovery can also allow retreat. | Boss damage/phases persist across retry; ordinary enemies reset. Temporary Block/Mark clears. No reward or Steal farming. |
| **Trial altar nodes** | Three trials, two questions each: chapter 1 row 5 (100/200), row 10 (200/300); chapter 2 row 6 (100/300). | First arrival announces the class event; later arrivals cannot trigger it again. Learning can be disabled before Start. |
| **Trial tile votes** | Vote category/value; each crew contributes one class vote. Crew badges show choices; rotating priority breaks ties. | No fastest-click selection or extra class votes for a larger crew. Each trial uses its two value bands once. |
| **Trial wagers** | Before the question: Steady 1×, Bold 2×, Oath 3×. Correct answers earn that multiplier. | Wrong/missing: +1 stress / +3 stress / named curse. No wager defaults to Steady; accepted wagers persist. |
| **Trial answers / reveal** | Every student answers privately once. Lock when everyone answers or after 45 / 60 / 75 seconds for 100 / 200 / 300. | No speed bonus or answer changes. Reveal retains all options, correct answer, your choice and explanation. |
| **Trial points / gold** | Crew points = sum of correct value × multiplier ÷ starting roster. Gold = `floor(value/100 × 6 × correct multiplier sum ÷ roster)`. | Spirits count in the denominator. A fully correct 100-value crew gets 6 / 12 / 18 gold at Steady / Bold / Oath; debt is paid first. |
| **Trial Blessing reward** | At least one correct answer earns a choice. Correct multipliers total 1–3: rank I; 4+: rank II. | Best/tied crews normally get three options, others two; choose one eligible trait. No duplicate settlement. Points break final progress ties. |
| **Question content** | Three categories: Run Rules, Hits & Rewards, Time & Feedback; 18 self-contained Week 5/mobile-game scenarios. | Questions occur only in scheduled trials, not after battles, shops, caches or arenas. No prior game knowledge required. |
| **Class siege node** | Chapter 2 row 10: all crews coordinate Attack, Protect or Supply for up to three rounds; spirits Supply. | Fill all three class meters. Success: 12 crew gold + one draught per hero; failure: +2 stress, with normal panic rules. |
| **Arena node / consent** | Meet another crew at an arena in the same chapter, challenge, wait/cancel, or choose an NPC after 20 seconds. | Every living fighter needs half HP; each crew needs a strict Yes majority. A No cancels a pending offer. Host may disable new challenges. |
| **Arena combat / rewards** | Three nonlethal Strike / Guard / Feint exchanges; winner gets 12 gold, gear choice and supplies; loser/draw gets 6 gold and supplies. | One completed arena per crew. Dungeon skills/gear/traits are suspended; actual health loss remains afterward. No direct ranking points. |
| **Shared-event handoff** | Trials/siege interrupt at a safe boundary after active reveals, then restore each crew's saved decision and clock. | Never rerun settled damage, purchases, rewards or duel exchanges. Other crews otherwise progress independently. |
| **Host view / moderation** | See all crews, public builds, readiness, votes, stakes and coin outcomes; pause/resume, resolve missing choices, cancel duels, skip events, recover devices or End. | No arbitrary gold/stat edits, resurrection or production impersonation. Private answers/offers/session secrets stay hidden. |
| **Offline / restart** | Refresh/reconnect preserves identity, committed choices, build and progress. Absent-member defaults preserve offers after 15 seconds. | All-offline crews suspend. Host absence: 90-second grace, then pause; reconnection/restart needs explicit Resume. Failed saves preserve the last committed state. |
| **Decision timing** | Normal crews advance when all required choices are ready. Optional inactivity fallback supplies missing choices; result timeout is 60 seconds. | Fallback starts off. Manual developer mode requires Next phase; ordinary combat reveals remain automatic outside manual mode. |
| **Finished crew** | After boss two, inspect builds/standings and join pending shared events. | No more dungeon farming. 35–45 minutes is a playtest target, not a forced cutoff. |
| **Developer playground** | Launch `npm.cmd run dev -- --test`, open `/#/test`; control ten separate identities, bots/manual and populated scenarios. | Test mode is loopback-only and unavailable in normal classroom startup. `npm test` runs automated tests instead. |
| **Saved matches** | Current schema 10 / dungeon-v5 saves live in `data/rules-v10/`; matches retain their frozen content/rules. | Older save directories are untouched; no automatic migration. Existing saves without trial gold keep their old rewards. |
