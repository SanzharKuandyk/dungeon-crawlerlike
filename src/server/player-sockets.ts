import { z } from "zod";
import type { Envelope } from "../shared/protocol.js";
import {
  actionSchema,
  campSchema,
  classSchema,
  envelopeSchema,
  itemSchema,
  nameSchema,
} from "../shared/validation.js";
import { challenge, submitDuel, voteDuel } from "./duel-commands.js";
import { reject } from "./errors.js";
import { voteCamp, voteRoute } from "./handlers/crew-decisions.js";
import { submitAction, voteWithdraw } from "./handlers/hero-actions.js";
import { answerQuestion, chooseEquipment } from "./handlers/learning.js";
import { chooseClass, createCrew, joinCrew } from "./handlers/lobby.js";
import type { RoomManager } from "./room-manager.js";
import type { StoredRoom } from "./room-types.js";
import type { BindingGetter, GameSocket, Responder } from "./socket-types.js";

export function attachPlayerSockets(
  socket: GameSocket,
  manager: RoomManager,
  binding: BindingGetter,
  respond: Responder,
  clock: () => number,
) {
  const mutate = (
    input: Envelope,
    payload: unknown,
    edit: (room: StoredRoom, playerId: string) => void,
    decision?: "confirm" | "edit" | "withdraw" | "social",
  ) => {
    const b = binding(true);
    return manager.command(
      b,
      envelopeSchema.parse(input),
      payload,
      (r) => edit(r, b.session?.playerId ?? ""),
      decision,
    );
  };
  socket.on(
    "pvp:challenge",
    (input, ack) =>
      void respond(ack, async () =>
        mutate(
          input,
          input,
          (room, id) => challenge(room, id, z.string().parse(input.targetCrewId), clock()),
          "social",
        ),
      ),
  );
  socket.on(
    "pvp:vote",
    (input, ack) =>
      void respond(ack, async () =>
        mutate(
          input,
          input,
          (room, id) =>
            voteDuel(
              room,
              id,
              z.string().parse(input.duelId),
              z.boolean().parse(input.accept),
              clock(),
            ),
          "social",
        ),
      ),
  );
  socket.on(
    "pvp:action",
    (input, ack) =>
      void respond(ack, async () =>
        mutate(
          input,
          input,
          (room, id) =>
            submitDuel(
              room,
              id,
              z.string().parse(input.duelId),
              z
                .object({
                  kind: z.enum(["strike", "guard", "feint"]),
                  targetHeroId: z.string().optional(),
                })
                .parse(input.action),
              clock(),
            ),
          "social",
        ),
      ),
  );
  socket.on(
    "crew:create",
    (input, ack) =>
      void respond(ack, async () =>
        mutate(input, input, (r, id) => createCrew(r, id, nameSchema.parse(input.name))),
      ),
  );
  socket.on(
    "crew:join",
    (input, ack) =>
      void respond(ack, async () =>
        mutate(input, input, (r, id) => {
          if (typeof input.crewId !== "string") reject("INVALID", "Choose a crew.");
          joinCrew(r, id, input.crewId);
        }),
      ),
  );
  socket.on(
    "hero:class",
    (input, ack) =>
      void respond(ack, async () =>
        mutate(input, input, (r, id) => chooseClass(r, id, classSchema.parse(input.classId))),
      ),
  );
  socket.on("hero:action", (input, ack) => {
    const now = clock();
    void respond(ack, async () =>
      mutate(
        input,
        input,
        (r, id) => submitAction(r, id, actionSchema.parse(input.action), now),
        "confirm",
      ),
    );
  });
  socket.on("route:vote", (input, ack) => {
    const now = clock();
    void respond(ack, async () =>
      mutate(input, input, (r, id) => voteRoute(r, id, input.roomId, now), "confirm"),
    );
  });
  socket.on("crew:withdraw", (input, ack) => {
    const now = clock();
    void respond(ack, async () =>
      mutate(
        input,
        input,
        (r, id) => {
          if (typeof input.withdraw !== "boolean") reject("INVALID", "Invalid withdrawal vote.");
          voteWithdraw(r, id, input.withdraw, now);
        },
        "withdraw",
      ),
    );
  });
  socket.on("camp:vote", (input, ack) => {
    const now = clock();
    void respond(ack, async () =>
      mutate(
        input,
        input,
        (r, id) => voteCamp(r, id, campSchema.parse(input.choice), now),
        "confirm",
      ),
    );
  });
  socket.on("learning:answer", (input, ack) => {
    const now = clock();
    void respond(ack, async () =>
      mutate(input, input, (r, id) =>
        answerQuestion(r, id, input.questionId, input.choice, now, input.pact),
      ),
    );
  });
  socket.on("equipment:choose", (input, ack) => {
    const now = clock();
    void respond(ack, async () =>
      mutate(
        input,
        input,
        (r, id) => chooseEquipment(r, id, itemSchema.parse(input.item), now),
        "confirm",
      ),
    );
  });
  socket.on("decision:edit", (input, ack) => {
    void respond(ack, async () =>
      mutate(
        input,
        input,
        (room) => {
          if (
            room.state.status !== "running" ||
            !["combat", "route", "camp", "equipment"].includes(room.state.phase.kind)
          )
            reject("CLOSED", "This decision is closed.");
        },
        "edit",
      ),
    );
  });
}
