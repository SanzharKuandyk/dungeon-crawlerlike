export type SharedEventId = "trial-1" | "trial-2" | "trial-3" | "siege-1";
export type SharedEventRecord = {
  id: SharedEventId;
  status: "pending" | "active" | "completed" | "skipped";
  triggerCrewId: string;
};
export type SharedEventDefinition = {
  id: SharedEventId;
  chapter: 1 | 2;
  row: number;
  bands: (100 | 200 | 300)[];
};
