import { readFile } from "node:fs/promises";
import type { DungeonContent } from "../shared/content-types.js";
import {
  classDefinitionSchema,
  questionSchema,
  roomDefinitionSchema,
} from "../shared/validation.js";

export async function loadContent(): Promise<DungeonContent> {
  const read = async (name: string): Promise<unknown> => JSON.parse(await readFile(name, "utf8"));
  const classes = classDefinitionSchema.array().parse(await read("content/dungeon/classes.json"));
  const rooms = roomDefinitionSchema.array().parse(await read("content/dungeon/rooms.json"));
  const questions = questionSchema.array().parse(await read("content/learning/week-4.json"));
  if (classes.length !== 6 || new Set(classes.map((c) => c.id)).size !== 6)
    throw new Error("Need six unique classes.");
  if (rooms.length !== 15 || new Set(rooms.map((r) => r.id)).size !== 15)
    throw new Error("Need fifteen unique rooms.");
  for (let depth = 1; depth <= 5; depth++)
    if (new Set(rooms.filter((r) => r.depth === depth).map((r) => r.risk)).size !== 3)
      throw new Error("Each depth needs three risk levels.");
  if (!questions.length || new Set(questions.map((q) => q.id)).size !== questions.length)
    throw new Error("Questions need unique IDs.");
  return { classes, rooms, questions };
}
