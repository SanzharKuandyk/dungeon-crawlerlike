export type ClassId = "knight" | "physician" | "occultist" | "scavenger" | "wanderer" | "exorcist";
export type EnemyFamily = "sentinel" | "seer" | "devourer";
export type Risk = "low" | "medium" | "high";
export type ClassDefinition = {
  id: ClassId;
  name: string;
  skill: string;
  description: string;
  maxCrewSize: 2 | 4;
};
export type RoomDefinition = {
  id: string;
  depth: number;
  name: string;
  risk: Risk;
  family: EnemyFamily;
  description: string;
};
export type Question = {
  id: string;
  topic: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  source: string;
};
export type DungeonContent = {
  classes: ClassDefinition[];
  rooms: RoomDefinition[];
  questions: Question[];
};
