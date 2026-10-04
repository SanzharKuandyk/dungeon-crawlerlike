import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createShop } from "../../src/game/inventory/shops.js";
import { chooseTile, createTrial } from "../../src/game/trials/board.js";
import { lockTrialQuestion } from "../../src/game/trials/scoring.js";
import { newClock } from "../../src/server/clocks.js";
import { startCrews } from "../../src/server/crew-clock.js";
import { createRoomManager, emptyRoom } from "../../src/server/room-manager.js";
import { fileStorage } from "../../src/server/storage.js";
import type { TrialPhase } from "../../src/shared/trial-types.js";
import { content, fixture } from "../fixtures/match.js";

const phases: TrialPhase["kind"][] = [
  "intro",
  "board-vote",
  "wager",
  "answer",
  "reveal",
  "blessing-choice",
  "return",
];
it.each(phases)(
  "restart preserves %s without consuming offline time or repeating effects",
  async (kind) => {
    const directory = await mkdtemp(join(tmpdir(), "dungeon-v4-restart-"));
    const storage = fileStorage(directory);
    const room = emptyRoom(fixture(1));
    startCrews(room, 1000);
    const trial = createTrial(room.state, 1, "Crew A awakened the First Trial.");
    room.state.trial = trial;
    room.state.completedTrials = [1];
    const questionId = chooseTile(room.state, trial);
    trial.wagers[room.state.players[0].id] = "bold";
    trial.answers[room.state.players[0].id] = 0;
    trial.phase = { kind: "answer", questionId };
    if (["reveal", "blessing-choice", "return"].includes(kind)) lockTrialQuestion(room.state);
    switch (kind) {
      case "board-vote":
        trial.phase = { kind, questionNumber: 1 };
        break;
      case "wager":
      case "answer":
      case "reveal":
        trial.phase = { kind, questionId };
        break;
      default:
        trial.phase = { kind };
    }
    room.state.phaseId = 50;
    room.state.crewProgress.c0.actions[room.state.players[0].id] = { kind: "brace" };
    room.timer = newClock(10000, 1000, true);
    room.deadline = 11000;
    room.savedAt = 4000;
    room.state.crews[0].shop = createShop(room.state, "c0", "visit");
    room.state.crews[0].shop.allowances[room.state.heroes[0].id] = 7;
    room.state.crews[0].economy.rescueDebt = 24;
    const durable = structuredClone(room.state);
    await storage.save(room);
    const manager = createRoomManager(storage, content, () => 999000);
    await manager.restore();
    const recovered = manager.rooms.get(room.state.code);
    expect(recovered?.state.status).toBe("paused");
    expect(recovered?.pauseReasons).toContain("server-restart");
    expect(recovered?.timer.remainingMs).toBe(7000);
    expect(recovered?.timer.elapsedMs).toBe(3000);
    expect(recovered?.state.trial).toEqual(durable.trial);
    expect(recovered?.state.crews).toEqual(durable.crews);
    expect(recovered?.state.heroes).toEqual(durable.heroes);
    expect(recovered?.state.outcomeRng).toEqual(durable.outcomeRng);
    expect(recovered?.state.crewProgress).toEqual(durable.crewProgress);
    await manager.tick(1000000);
    expect(recovered?.state.trial).toEqual(durable.trial);
    expect(recovered?.state.crews[0].trialScoreUnits).toBe(durable.crews[0].trialScoreUnits);
  },
);
