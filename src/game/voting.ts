import type { CampChoice } from "../shared/command-types.js";
import type { MatchState } from "../shared/game-types.js";
import { reachableNodes } from "./expedition-map.js";
import { shuffled } from "./random.js";
export function livingMembers(s: MatchState, id: string) {
  return s.players.filter(
    (p) => p.crewId === id && s.heroes.some((h) => h.playerId === p.id && h.status === "alive"),
  );
}
export function plurality<T extends string>(
  s: MatchState,
  id: string,
  votes: Record<string, T>,
  fallback: T,
): T {
  const members = livingMembers(s, id);
  if (!members.length) return fallback;
  const start = (s.crewProgress[id]?.depth ?? 1) % members.length;
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
  const nodes = reachableNodes(s, id);
  return plurality(
    s,
    id,
    Object.fromEntries(
      Object.entries(s.crewProgress[id]?.routeVotes ?? {}).filter(([, value]) =>
        nodes.some((n) => n.id === value),
      ),
    ),
    nodes.find((n) => n.kind !== "elite" && n.kind !== "arena")?.id ?? nodes[0]?.id ?? "",
  );
}
export function winningCamp(s: MatchState, id: string): CampChoice {
  const crew = s.crews.find((c) => c.id === id),
    p = s.crewProgress[id];
  return plurality(
    s,
    id,
    p?.campVotes ?? {},
    crew?.status === "eliminated"
      ? "rescue"
      : p?.recovering ||
          ["camp", "altar", "shrine"].includes(
            s.chapterMaps[(p?.chapter ?? 1) - 1]?.nodes.find((n) => n.id === p?.nodeId)?.kind ?? "",
          )
        ? "rest"
        : "continue",
  );
}
export function priority<T extends { id: string }>(s: MatchState, values: T[]) {
  const ordered = shuffled(values, s.seed);
  const start = s.globalTurn % Math.max(1, ordered.length);
  return [...ordered.slice(start), ...ordered.slice(0, start)];
}
