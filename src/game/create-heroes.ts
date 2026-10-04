import { POWER } from "../shared/constants.js";
import type { MatchState } from "../shared/game-types.js";

export function createHeroes(s: MatchState) {
  s.heroes = [];
  for (const c of s.crews) {
    const members = s.players.filter((p) => p.crewId === c.id);
    if (members.length < 1 || members.length > 4) throw new Error("Crews need 1–4 members.");
    c.startingSize = members.length as 1 | 2 | 3 | 4;
    c.playerIds = members.map((p) => p.id);
    const power = POWER[c.startingSize];
    for (const p of members) {
      const definition = s.content.classes.find((v) => v.id === p.classId);
      if (!definition || members.length > definition.maxCrewSize)
        throw new Error("Class is not available for this crew size.");
      s.heroes.push({
        pendingBlessings: [],
        expeditionUses: [],
        inventory: {
          revision: 0,
          equipment: { weapon: null, armor: null, charm: null },
          backpack: [{ id: `start:${p.id}`, kind: "draught", count: 1 }],
          overflow: [],
        },
        conditions: { injuries: [], blessings: [], afflictions: [], combatEffects: [] },
        skillReadyTurn: 1,
        encounterUses: [],
        id: `hero:${p.id}`,
        playerId: p.id,
        crewId: c.id,
        classId: p.classId,
        power,
        maxHp: 4 * power,
        hp: 4 * power,
        stress: 0,
        status: "alive",
      });
    }
  }
}
