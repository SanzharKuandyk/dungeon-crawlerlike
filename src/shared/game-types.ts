import type { CampChoice, HeroAction } from "./command-types.js";
import type { ClassId, DungeonContent, EnemyFamily, RoomDefinition } from "./content-types.js";
import type { GameEvent } from "./event-types.js";
import type { ExpeditionMap, MapPosition } from "./map-types.js";

export type Phase =
  | { kind: "route" }
  | { kind: "arrival" }
  | { kind: "combat" }
  | { kind: "combat-reveal" }
  | { kind: "combat-recap" }
  | { kind: "floor-result" }
  | { kind: "result" }
  | {
      kind: "shared-event";
      eventId: import("./shared-event-types.js").SharedEventId;
      stage: string;
    }
  | { kind: "question-intro"; questionId: string }
  | { kind: "question"; questionId: string }
  | { kind: "explanation"; questionId: string }
  | { kind: "equipment"; questionId: string }
  | { kind: "return" }
  | { kind: "camp" }
  | { kind: "camp-reveal" }
  | { kind: "event" }
  | { kind: "event-reveal" }
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

export type Hero = import("./hero-types.js").HeroBuild & {
  id: string;
  playerId: string;
  crewId: string;
  classId: ClassId;
  power: 3 | 4 | 6 | 12;
  maxHp: number;
  hp: number;
  stress: number;
  status: "alive" | "dead";
};

export type Crew = {
  economy: { gold: number; rescueDebt: number };
  bossesDefeated: number;
  completedNodeIds: string[];
  trialScoreUnits: number;
  rewardedNodeIds: string[];
  shop: import("./inventory-types.js").ShopVisit | null;
  id: string;
  name: string;
  symbol: string;
  colorId: string;
  playerIds: string[];
  startingSize: 1 | 2 | 3 | 4;
  status: "active" | "eliminated";
  mapPosition?: MapPosition;
  location: { kind: "room"; roomId: string } | { kind: "camp" };
};

export type RoomEncounter = import("./encounter-types.js").EncounterBuild & {
  id: string;
  definition: RoomDefinition;
  crewIds: string[];
  enteringPower: Record<string, number>;
  spawnPower: number;
  hp: number;
  maxHp: number;
  enemies: import("./encounter-types.js").EnemyInstance[];
  status: "active" | "defeated" | "abandoned" | "timed-out";
  contribution: Record<string, number>;
  purseAwarded: boolean;
  chapter?: number;
  rivalry?: { winnerCrewId: string | null };
};

export type ArenaState = { heroes: Hero[]; crews: Crew[]; encounters: RoomEncounter[] };

export type MatchState = ArenaState & {
  crewProgress: Record<string, import("./progression-types.js").CrewProgress>;
  chapterMaps: import("./map-types.js").ExpeditionMap[];
  trialPack: import("./trial-types.js").TrialPack;
  trial: import("./trial-types.js").Trial | null;
  sharedEvents: import("./shared-event-types.js").SharedEventRecord[];
  siege: import("./siege-types.js").SiegeState | null;
  usedTrialQuestions: string[];
  outcomeRng: Record<string, number>;
  trialRng: number;
  transactions: Record<string, import("./feedback-types.js").TransactionFeedback>;
  rewardSeed: number;
  rewardRng: Record<string, number>;
  rewardOffers: import("./reward-types.js").RewardOffer[];
  id: string;
  code: string;
  rulesVersion: "dungeon-v5";
  expeditionMap?: ExpeditionMap;
  seed: number;
  outcomeSeed: number;
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
  resolvedActions: Record<string, HeroAction>;
  learningEnabled: boolean;
  resolvedPhaseIds: number[];
  before: ArenaState | null;
  events: GameEvent[];
  history: GameEvent[];
  winners: string[];
};

export type EnemyType = EnemyFamily;
