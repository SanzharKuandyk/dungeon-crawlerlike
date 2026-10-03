import { expect, it } from "vitest";
import { grantEquipment, lockQuiz, personalReward } from "../../src/game/learning.js";
import { answerQuestion } from "../../src/server/handlers/learning.js";
import { emptyRoom } from "../../src/server/room-manager.js";
import { fixture } from "../fixtures/match.js";

it("Study is safe; Blood pays real health for guaranteed equipment with a correctness bonus", () => {
  for (const pact of ["careful", "blood"] as const)
    for (const correct of [true, false]) {
      const state = fixture(1);
      state.rulesVersion = "dungeon-v2";
      const question = state.content.questions[0];
      state.quizQuestionId = question.id;
      state.phase = { kind: "question", questionId: question.id };
      const hero = state.heroes[0];
      const hp = hero.hp;
      answerQuestion(
        emptyRoom(state),
        hero.playerId,
        question.id,
        correct ? question.correctIndex : (question.correctIndex + 1) % 4,
        0,
        pact,
      );
      expect(personalReward(state, hero.playerId)).toBeNull();
      lockQuiz(state);
      expect(hero.hp).toBe(hp - (pact === "blood" ? hero.power : 0));
      expect(personalReward(state, hero.playerId)).toBe(
        pact === "blood" ? (correct ? 2 : 1) : correct ? 1 : null,
      );
      expect(() => lockQuiz(state)).toThrow("already");
      state.phaseId++;
      grantEquipment(state);
      expect(hero.equipment?.charges ?? null).toBe(personalReward(state, hero.playerId));
    }
});
it("a blood pact cannot be selected by a spirit or without enough health", () => {
  const state = fixture(1);
  const hero = state.heroes[0];
  const question = state.content.questions[0];
  state.quizQuestionId = question.id;
  state.phase = { kind: "question", questionId: question.id };
  hero.hp = hero.power;
  expect(() => answerQuestion(emptyRoom(state), hero.playerId, question.id, 0, 0, "blood")).toThrow(
    "health",
  );
  expect(state.answers).toEqual({});
});

it("missing answers earn no equipment and never charge health", () => {
  const state = fixture(1);
  state.rulesVersion = "dungeon-v2";
  state.quizQuestionId = state.content.questions[0].id;
  const hp = state.heroes[0].hp;
  lockQuiz(state);
  expect(personalReward(state, state.heroes[0].playerId)).toBeNull();
  expect(state.heroes[0].hp).toBe(hp);
});
