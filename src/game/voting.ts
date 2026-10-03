import type { CampChoice } from "../shared/command-types.js";
import type { MatchState } from "../shared/game-types.js";
import { reachableNodes } from "./expedition-map.js";
import { shuffled } from "./random.js";

export function livingMembers(s: MatchState, crewId: string) {
  return s.players.filter(
    (p) => p.crewId === crewId && s.heroes.some((h) => h.playerId === p.id && h.status === "alive"),
  );
}
export function plurality<T extends string>(
  s: MatchState,
  crewId: string,
  votes: Record<string, T>,
  fallback: T,
): T {
  const members = livingMembers(s, crewId);
  if (!members.length) return fallback;
  const start = (s.depth - 1) % members.length;
  const ordered = [...members.slice(start), ...members.slice(0, start)];
  const counts = new Map<T, number>();
  for (const p of members)
    if (votes[p.id] !== undefined) counts.set(votes[p.id], (counts.get(votes[p.id]) ?? 0) + 1);
  const max = Math.max(0, ...counts.values());
  return (
    ordered.map((p) => votes[p.id]).find((v) => v !== undefined && counts.get(v) === max) ??
    fallback
  );
}
export function winningRoute(s: MatchState, id: string) {
  if (s.expeditionMap) {
    const nodes = reachableNodes(s, id);
    const allowed = new Set(nodes.map((node) => node.id));
    const votes = Object.fromEntries(
      Object.entries(s.routeVotes).filter(([, nodeId]) => allowed.has(nodeId)),
    );
    const fallback =
      nodes.find((node) => node.kind === "camp") ??
      nodes.find((node) => node.room.risk === "low") ??
      nodes[0];

    return plurality(s, id, votes, fallback?.id ?? "");
  }

  return plurality(s, id, s.routeVotes, s.offeredRooms.find((r) => r.risk === "low")?.id ?? "");
}
export function winningCamp(s: MatchState, id: string): CampChoice {
  return plurality(
    s,
    id,
    s.campVotes,
    s.crews.find((c) => c.id === id)?.carriedTreasure ? "secure" : "rest",
  );
}
export function priority<T extends { id: string }>(s: MatchState, values: T[]): T[] {
  const ordered = shuffled(values, s.seed);
  if (!ordered.length) return [];
  const start = Math.max(0, s.globalTurn - 1) % ordered.length;
  return [...ordered.slice(start), ...ordered.slice(0, start)];
}
