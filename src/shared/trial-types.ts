export type WagerLevel = "steady" | "bold" | "oath";
export type TrialValue = 100 | 200 | 300;
export type TrialPhase =
  | { kind: "intro" }
  | { kind: "board-vote"; questionNumber: number }
  | { kind: "wager" | "answer" | "reveal"; questionId: string }
  | { kind: "blessing-choice" }
  | { kind: "return" };
export type TrialQuestion = {
  id: string;
  category: string;
  value: TrialValue;
  prompt: string;
  code: string | null;
  choices: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  distractors: [string, string, string, string];
  reference: { file: string; slide: string };
  reviewed: boolean;
};
export type TrialPack = {
  fixture: boolean;
  categories: [string, string, string];
  questions: TrialQuestion[];
};
export type TrialTile = { id: string; category: string; value: TrialValue };
export type BlessingOffer = {
  id: string;
  groupId?: string;
  kind: import("./condition-types.js").BlessingKind;
  rank: import("./condition-types.js").TraitRank;
};
export type TrialAnswerResult = {
  playerId: string;
  choice: number | null;
  correct: boolean;
  wager: WagerLevel;
  units: number;
  consequence: string;
};
export type Trial = {
  eventId: import("./shared-event-types.js").SharedEventId;
  selection: { tileId: string; crewVotes: Record<string, string>; reason: string } | null;
  id: string;
  chapter: 1 | 2;
  cause: string;
  phase: TrialPhase;
  questionNumber: number;
  tiles: TrialTile[];
  usedValues: TrialValue[];
  votes: Record<string, string>;
  wagers: Record<string, WagerLevel>;
  answers: Record<string, number>;
  oath: import("./condition-types.js").AfflictionKind;
  results: TrialAnswerResult[];
  totals: Record<string, number>;
  favour: Record<string, number>;
  offers: Record<string, BlessingOffer[]>;
  choices: Record<string, string>;
  resolvedQuestions: string[];
  rewardsGranted: boolean;
  questionGold?: Record<string, { earned: number; debtPaid: number }>;
};
export type TrialView = {
  eventId: import("./shared-event-types.js").SharedEventId;
  questionCount: number;
  crewVotes: { crewId: string; tileId: string | null; submitted: number; total: number }[];
  selectionReason: string | null;
  wagers: { playerId: string; wager: WagerLevel }[];
  selectedTile: TrialTile | null;
  id: string;
  chapter: number;
  cause: string;
  phase: TrialPhase;
  tiles: TrialTile[];
  usedValues: TrialValue[];
  questionNumber: number;
  fixture: boolean;
  question: Omit<TrialQuestion, "correctIndex" | "explanation" | "distractors" | "reviewed"> | null;
  correctIndex: number | null;
  explanation: string | null;
  distractors: string[];
  totals: Record<string, number>;
  accuracy: { crewId: string; correct: number; total: number }[];
  oath: import("./condition-types.js").AfflictionKind;
  goldPer100: number;
  goldRewards: Record<string, { earned: number; debtPaid: number }>;
};
