import { expect, it } from "vitest";
import { chooseTile, createTrial, validateTrialPack } from "../../src/game/trials/board.js";
import { projectTrial } from "../../src/game/trials/projections.js";
import { lockTrialQuestion } from "../../src/game/trials/scoring.js";
import { loadContent } from "../../src/server/content.js";
import { createRoomManager } from "../../src/server/room-manager.js";
import { fixture } from "../fixtures/match.js";
import { memoryStorage } from "../fixtures/server.js";

it("loads the Week 5 pack and enables trials in new classroom rooms", async () => {
  const content = await loadContent();
  const pack = content.trialPack;
  if (!pack) throw new Error("Missing trial pack");
  expect(() => validateTrialPack(pack, true)).not.toThrow();
  expect(pack.fixture).toBe(false);
  expect(pack.questions).toHaveLength(18);
  expect(new Set(pack.questions.map((q) => q.prompt)).size).toBe(18);
  for (const q of pack.questions) {
    expect(q.reference.file).toBe("MGD_5_week.pptx");
    expect(q.reference.slide).toMatch(/^Slides? \d/);
    expect(q.prompt).not.toMatch(/Roblox|DEV FIXTURE/);
  }
  const manager = createRoomManager(memoryStorage().storage, content);
  const { code } = await manager.create("week5-content-host");
  expect(manager.rooms.get(code)?.state.learningEnabled).toBe(true);
  expect(manager.rooms.get(code)?.state.trialPack).toEqual(pack);
});

it.each([0, 1, 2])(
  "all three trials can use category %i without repeating questions or leaking solutions",
  async (categoryIndex) => {
    const content = await loadContent();
    const state = fixture(2, [1, 4]);
    if (!content.trialPack) throw new Error("Missing trial pack");
    state.trialPack = content.trialPack;
    for (const [eventId, chapter, values] of [
      ["trial-1", 1, [100, 200]],
      ["trial-2", 1, [200, 300]],
      ["trial-3", 2, [100, 300]],
    ] as const) {
      const trial = createTrial(state, chapter, "Trial altar", eventId);
      state.trial = trial;
      for (const value of values) {
        for (const player of state.players)
          trial.votes[player.id] = `tile:${categoryIndex}:${value}`;
        const id = chooseTile(state, trial);
        const question = state.trialPack.questions.find((q) => q.id === id);
        if (!question) throw new Error("Missing question");
        expect(question.value).toBe(value);
        expect(question.category).toBe(state.trialPack.categories[categoryIndex]);
        trial.phase = { kind: "wager", questionId: id };
        expect(projectTrial(state)?.question).toBeNull();
        trial.phase = { kind: "answer", questionId: id };
        const publicQuestion = projectTrial(state);
        expect(publicQuestion?.correctIndex).toBeNull();
        expect(publicQuestion?.explanation).toBeNull();
        expect(publicQuestion?.distractors).toEqual([]);
        expect(publicQuestion?.question).not.toHaveProperty("correctIndex");
        for (const player of state.players) trial.answers[player.id] = question.correctIndex;
        lockTrialQuestion(state);
        trial.phase = { kind: "reveal", questionId: id };
        expect(projectTrial(state)?.correctIndex).toBe(question.correctIndex);
        expect(projectTrial(state)?.explanation).toBe(question.explanation);
      }
      expect(trial.usedValues).toEqual(values);
      expect(trial.totals[state.crews[0].id]).toBe(values.reduce((a, b) => a + b, 0) * 12);
      expect(trial.totals[state.crews[1].id]).toBe(values.reduce((a, b) => a + b, 0) * 12);
    }
    expect(state.usedTrialQuestions).toHaveLength(6);
    expect(new Set(state.usedTrialQuestions).size).toBe(6);
  },
);

it("restored rooms retain frozen questions when the installed content changes", async () => {
  const content = await loadContent();
  const memory = memoryStorage();
  const original = createRoomManager(memory.storage, content);
  const created = await original.create("original-content-host");
  const frozen = structuredClone(original.rooms.get(created.code)?.state.trialPack);
  const edited = structuredClone(content);
  if (!edited.trialPack) throw new Error("Missing trial pack");
  edited.trialPack.questions[0].prompt = "An edited question for future rooms.";
  const restarted = createRoomManager(memory.storage, edited);
  await restarted.restore();
  expect(restarted.rooms.get(created.code)?.state.trialPack).toEqual(frozen);
  const next = await restarted.create("new-content-host");
  expect(restarted.rooms.get(next.code)?.state.trialPack.questions[0].prompt).toBe(
    "An edited question for future rooms.",
  );
});
