export const MAX_DEPTH = 5;
export const MAX_TURNS = 4;
export const CLASS_IDS = [
  "knight",
  "physician",
  "occultist",
  "scavenger",
  "wanderer",
  "exorcist",
] as const;
export const POWER = { 1: 12, 2: 6, 3: 4, 4: 3 } as const;
const normal = {
  event: 30000,
  "event-reveal": 3000,
  "shared-event": 3000,
  route: 25000,
  arrival: 4000,
  combat: 45000,
  "combat-reveal": 10000,
  "combat-recap": 3000,
  "floor-result": 6000,
  result: 60000,
  "question-intro": 2000,
  question: 35000,
  explanation: 8000,
  equipment: 20000,
  return: 2000,
  camp: 25000,
  "camp-reveal": 6000,
  extraction: 10000,
};
const fast = {
  event: 3000,
  "event-reveal": 500,
  "shared-event": 500,
  route: 3000,
  arrival: 500,
  combat: 3000,
  "combat-reveal": 1000,
  "combat-recap": 500,
  "floor-result": 500,
  result: 3000,
  "question-intro": 250,
  question: 4000,
  explanation: 500,
  equipment: 2000,
  return: 250,
  camp: 2000,
  "camp-reveal": 500,
  extraction: 1000,
};
export const DURATIONS = { normal, fast } as const;
