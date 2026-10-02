import type { CampChoice, EquipmentChoice, HeroAction } from "./command-types.js";
import type { ClassId, DungeonContent, EnemyFamily, RoomDefinition } from "./content-types.js";
import type { GameEvent } from "./event-types.js";
import type { ExpeditionMap, MapPosition } from "./map-types.js";

export type { Question } from "./content-types.js";
export type EquipmentKind = "ward" | "salve" | "lantern";
export type Equipment = { kind: EquipmentKind; charges: 1 | 2 };
export type Phase =
  | { kind: "route" }
  | { kind: "arrival" }
  | { kind: "combat" }
  | { kind: "combat-reveal" }
  | { kind: "combat-recap" }
  | { kind: "floor-result" }
  | { kind: "question-intro"; questionId: string }
  | { kind: "question"; questionId: string }
  | { kind: "explanation"; questionId: string }
  | { kind: "equipment"; questionId: string }
  | { kind: "return" }
  | { kind: "camp" }
  | { kind: "camp-reveal" }
  | { kind: "extraction" };
export type PhaseKind = Phase["kind"];
export type Player = {
  id: string;
  name: string;
  crewId: string | null;
  connected: boolean;
  bot: boolean;
  classId: ClassId;
  classNotice: string | null;
};
export type Hero = {
  id: string;
  playerId: string;
  crewId: string;
  classId: ClassId;
  power: 3 | 4 | 6 | 12;
  maxHp: number;
  hp: number;
  stress: number;
  status: "alive" | "dead";
  equipment: Equipment | null;
  equipmentActiveFromTurn: number;
  bargainDepth: number | null;
  mastery?: { rank: 1 | 2; activeFromTurn: number };
};
export type Crew = {
  id: string;
  name: string;
  symbol: string;
  colorId: string;
  playerIds: string[];
  startingSize: 1 | 2 | 3 | 4;
  carriedTreasure: number;
  securedTreasure: number;
  status: "active" | "eliminated";
  mapPosition?: MapPosition;
  location: { kind: "room"; roomId: string } | { kind: "camp" };
};
export type RoomEncounter = {
  id: string;
  definition: RoomDefinition;
  crewIds: string[];
  enteringPower: Record<string, number>;
  spawnPower: number;
  bodyHp: number;
  maxBodyHp: number;
  weakHp: number;
  maxWeakHp: number;
  status: "active" | "defeated" | "abandoned" | "timed-out";
  contribution: Record<string, number>;
  purseAwarded: boolean;
  chapter?: number;
  rivalry?: { winnerCrewId: string | null };
};
export type QuizResult = {
  crewId: string;
  correct: number;
  total: number;
  tier: "perfect" | "partial" | "none";
};
export type ArenaState = { heroes: Hero[]; crews: Crew[]; encounters: RoomEncounter[] };
export type MatchState = ArenaState & {
  id: string;
  code: string;
  rulesVersion: "dungeon-v1";
  expeditionFeatures?: "rivalries-v1";
  expeditionMap?: ExpeditionMap;
  seed: number;
  revision: number;
  status: "lobby" | "running" | "paused" | "finished";
  depth: number;
  turn: number;
  globalTurn: number;
  phase: Phase;
  phaseId: number;
  players: Player[];
  crewSerial: number;
  content: DungeonContent;
  offeredRooms: RoomDefinition[];
  actions: Record<string, HeroAction>;
  routeVotes: Record<string, string>;
  campVotes: Record<string, CampChoice>;
  withdrawVotes: Record<string, boolean>;
  answers: Record<string, number>;
  equipmentChoices: Record<string, EquipmentChoice>;
  resolvedActions: Record<string, HeroAction>;
  learningEnabled: boolean;
  questionDeck: string[];
  usedQuestions: string[];
  quizDepths: number[];
  quizResults: QuizResult[];
  quizCause: string | null;
  quizQuestionId: string | null;
  quizLocked: boolean;
  quizGranted: boolean;
  quizContinuation: "start-combat" | "next-combat-turn" | "finish-floor" | null;
  treasureEquipmentDepths: Record<string, number>;
  resolvedPhaseIds: number[];
  before: ArenaState | null;
  events: GameEvent[];
  history: GameEvent[];
  winners: string[];
};
export type EnemyIntent = {
  damage: number;
  lootDamage: number;
  stress: number;
  description: string;
};
export type EnemyType = EnemyFamily;
