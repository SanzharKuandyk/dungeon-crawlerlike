import { startMatch } from "../../game/create-match.js";
import type { HostInput } from "../../shared/protocol.js";
import { audit } from "../audit.js";
import { startCrews } from "../crew-clock.js";
import { reject } from "../errors.js";
import { enter } from "../room-clock.js";
import { closeSession, pauseRoom, resumeRoom } from "../room-lifecycle.js";
import type { StoredRoom } from "../room-types.js";
import { hostCrewControl } from "./host-crews.js";
import { hostModeration } from "./host-moderation.js";

export function hostControl(room: StoredRoom, input: HostInput, now: number) {
  const command = input.command;
  switch (command.kind) {
    case "start":
      room.pauseReasons = [];
      startMatch(room.state);
      enter(room, { kind: "route" }, now);
      if (room.state.rulesVersion === "dungeon-v4") startCrews(room, now);
      break;
    case "pause":
      if (room.state.status !== "running" && room.state.status !== "paused")
        reject("CLOSED", "Start the expedition first.");
      pauseRoom(room, "host", now);
      break;
    case "resume":
      if (room.state.status !== "paused") reject("CLOSED", "The expedition is not paused.");
      resumeRoom(room, now);
      break;
    case "end":
      closeSession(room, now, "ended");
      break;
    case "learning":
    case "fallback":
      if (room.state.status !== "lobby") reject("CLOSED", "Choose this before starting.");
      if (command.kind === "learning") {
        if (command.enabled && !room.testMode && room.state.trialPack.fixture)
          reject("INVALID", "Reviewed lecture trial content is not installed.");
        room.state.learningEnabled = command.enabled;
      } else room.inactivityFallback = command.enabled;
      break;
    case "pvp-policy":
      room.pvpEnabled = command.enabled;
      if (!command.enabled)
        for (const duel of room.duels)
          if (["offered", "champion-offer"].includes(duel.status)) duel.status = "declined";
      break;
    case "crew-pause":
    case "crew-resume":
    case "crew-extend":
    case "crew-resolve":
      hostCrewControl(room, command, now);
      break;
    case "duel-cancel":
    case "question-skip":
      hostModeration(room, command, now);
      break;
  }

  audit(
    room,
    {
      commandId: input.requestId,
      intervention: command.kind,
      crewIds: "crewId" in command ? [command.crewId] : [],
      playerId: null,
    },
    `Host: ${command.kind.replaceAll("-", " ")}${"crewId" in command ? ` · ${room.state.crews.find((c) => c.id === command.crewId)?.name ?? command.crewId}` : ""}.`,
  );
}
