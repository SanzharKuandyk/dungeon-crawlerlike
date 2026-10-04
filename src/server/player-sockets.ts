import { z } from "zod";
import {
  inventoryEnvelopeSchema,
  shopSchema,
  treatmentSchema,
} from "../shared/inventory-validation.js";
import type { Envelope } from "../shared/protocol.js";
import { rewardClaimSchema } from "../shared/reward-validation.js";
import { trialCommandSchema, wagerSchema } from "../shared/trial-validation.js";
import {
  actionSchema,
  campSchema,
  classSchema,
  envelopeSchema,
  nameSchema,
} from "../shared/validation.js";
import { challenge, queueArena, submitDuel, voteDuel } from "./duel-commands.js";
import { reject } from "./errors.js";
import { buy, inventoryCommand, rescue, treat } from "./handlers/builds.js";
import { voteCamp, voteRoute } from "./handlers/crew-decisions.js";
import { submitAction, voteWithdraw } from "./handlers/hero-actions.js";
import { chooseClass, createCrew, joinCrew } from "./handlers/lobby.js";
import { claimReward, readyResult } from "./handlers/rewards.js";
import { answerTrial, chooseBlessing, voteTrial, wagerTrial } from "./handlers/trials.js";
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
    "reward:claim",
    (input, ack) =>
      void respond(ack, async () => {
        const v = rewardClaimSchema.parse(input);
        return mutate(
          v,
          v,
          (r, id) => claimReward(r, id, v.claim, v.inventoryRevision, v.requestId),
          "social",
        );
      }),
  );
  socket.on(
    "result:ready",
    (input, ack) =>
      void respond(ack, async () =>
        mutate(input, input, (r, id) => readyResult(r, id, clock()), "confirm"),
      ),
  );
  socket.on(
    "pvp:queue",
    (input, ack) =>
      void respond(ack, async () =>
        mutate(input, input, (r, id) => queueArena(r, id, clock()), "social"),
      ),
  );
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
  socket.on(
    "inventory:command",
    (input, ack) =>
      void respond(ack, async () => {
        const v = inventoryEnvelopeSchema.parse(input);
        return mutate(
          v,
          v,
          (r, id) => inventoryCommand(r, id, v.command, v.inventoryRevision, v.requestId),
          "social",
        );
      }),
  );
  socket.on(
    "shop:buy",
    (input, ack) =>
      void respond(ack, async () => {
        const v = shopSchema.parse(input);
        return mutate(
          v,
          v,
          (r, id) => buy(r, id, v.offerId, v.inventoryRevision, v.requestId),
          "social",
        );
      }),
  );
  socket.on(
    "camp:treat",
    (input, ack) =>
      void respond(ack, async () =>
        mutate(
          input,
          input,
          (r, id) => treat(r, id, treatmentSchema.parse(input.treatment), input.requestId),
          "social",
        ),
      ),
  );
  socket.on(
    "camp:rescue",
    (input, ack) =>
      void respond(ack, async () => mutate(input, input, (r, id) => rescue(r, id), "social")),
  );
  socket.on(
    "trial:vote",
    (input, ack) =>
      void respond(ack, async () => {
        const v = trialCommandSchema.extend({ tileId: z.string() }).strict().parse(input);
        return mutate(v, v, (r, id) => voteTrial(r, id, v.trialId, v.tileId), "social");
      }),
  );
  socket.on(
    "trial:wager",
    (input, ack) =>
      void respond(ack, async () => {
        const v = trialCommandSchema.extend({ wager: wagerSchema }).strict().parse(input);
        return mutate(v, v, (r, id) => wagerTrial(r, id, v.trialId, v.wager), "social");
      }),
  );
  socket.on(
    "trial:answer",
    (input, ack) =>
      void respond(ack, async () => {
        const v = trialCommandSchema
          .extend({ questionId: z.string(), choice: z.number().int().min(0).max(3) })
          .strict()
          .parse(input);
        return mutate(
          v,
          v,
          (r, id) => answerTrial(r, id, v.trialId, v.questionId, v.choice),
          "social",
        );
      }),
  );
  socket.on(
    "trial:blessing",
    (input, ack) =>
      void respond(ack, async () => {
        const v = trialCommandSchema
          .extend({
            offerId: z.string(),
            replace: z
              .enum([
                "iron-nerve",
                "sealbreaker",
                "last-stand",
                "field-medic",
                "clear-purpose",
                "second-breath",
              ])
              .nullable(),
          })
          .strict()
          .parse(input);
        return mutate(
          v,
          v,
          (r, id) => chooseBlessing(r, id, v.trialId, v.offerId, v.replace),
          "social",
        );
      }),
  );
  socket.on("decision:edit", (input, ack) => {
    void respond(ack, async () =>
      mutate(
        input,
        input,
        (room) => {
          if (
            room.state.status !== "running" ||
            !["combat", "route", "camp", "result"].includes(
              room.state.crewProgress[
                room.state.players.find((p) => p.id === binding(true).session?.playerId)?.crewId ??
                  ""
              ]?.phase.kind,
            )
          )
            reject("CLOSED", "This decision is closed.");
        },
        "edit",
      ),
    );
  });
}
