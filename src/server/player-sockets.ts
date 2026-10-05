import { z } from "zod";
import { chooseExploration } from "../game/progression/exploration.js";
import {
  inventoryEnvelopeSchema,
  shopSchema,
  treatmentSchema,
  upgradeSchema,
} from "../shared/inventory-validation.js";
import type { Envelope } from "../shared/protocol.js";
import { rewardClaimSchema } from "../shared/reward-validation.js";
import { trialCommandSchema, wagerSchema } from "../shared/trial-validation.js";
import {
  campSchema,
  classSchema,
  envelopeSchema,
  nameSchema,
  planSchema,
} from "../shared/validation.js";
import { challenge, queueArena, submitDuel, voteDuel } from "./duel-commands.js";
import { reject } from "./errors.js";
import { buy, inventoryCommand, recoverCrew, treat, upgrade } from "./handlers/builds.js";
import { voteCamp, voteRoute } from "./handlers/crew-decisions.js";
import { submitPlan, voteWithdraw } from "./handlers/hero-actions.js";
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
  socket.on(
    "siege:choose",
    (input, ack) =>
      void respond(ack, async () => {
        const v = envelopeSchema
          .extend({ siegeId: z.literal("siege-1"), role: z.enum(["attack", "protect", "supply"]) })
          .strict()
          .parse(input);
        return mutate(
          v,
          v,
          (room, id) => {
            if (
              room.state.status !== "running" ||
              room.state.siege?.id !== v.siegeId ||
              room.state.siege.phase !== "choice"
            )
              reject("CLOSED", "This siege choice is closed.");
            const hero = room.state.heroes.find((h) => h.playerId === id);
            if (!hero || (hero.status === "dead" && v.role !== "supply"))
              reject("INVALID", "Spirits can send supplies.");
            room.state.siege.choices[id] = v.role;
          },
          "social",
        );
      }),
  );
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
    "event:choose",
    (input, ack) =>
      void respond(ack, async () => {
        const choice = z
          .discriminatedUnion("kind", [
            z
              .object({
                kind: z.literal("coin"),
                side: z.enum(["heads", "tails"]),
                prize: z.enum(["gold", "blessing"]),
              })
              .strict(),
            z
              .object({
                kind: z.enum(["risk", "sacrifice", "recover-health", "recover-stress", "leave"]),
              })
              .strict(),
          ])
          .parse(input.choice) as import("../shared/exploration-types.js").ExplorationChoice;
        return mutate(
          input,
          input,
          (room, id) => {
            const hero = room.state.heroes.find((h) => h.playerId === id);
            if (!hero || room.state.crewProgress[hero.crewId]?.phase.kind !== "event")
              reject("CLOSED", "This event is closed.");
            try {
              chooseExploration(room.state, hero, choice);
            } catch (error) {
              reject("INVALID", error instanceof Error ? error.message : "Invalid event choice.");
            }
          },
          "confirm",
        );
      }),
  );
  socket.on(
    "shop:upgrade",
    (input, ack) =>
      void respond(ack, async () => {
        const v = upgradeSchema.parse(input);
        return mutate(
          v,
          v,
          (r, id) => upgrade(r, id, v.offerId, v.targetItemId, v.inventoryRevision, v.requestId),
          "social",
        );
      }),
  );
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
  socket.on("hero:plan", (input, ack) => {
    const now = clock();
    void respond(ack, async () =>
      mutate(
        input,
        input,
        (r, id) =>
          submitPlan(
            r,
            id,
            planSchema.parse(input.plan) as import("../shared/turn-plans.js").TurnPlan,
            now,
          ),
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
    "crew:recover",
    (input, ack) =>
      void respond(ack, async () => {
        const command = z
          .discriminatedUnion("kind", [
            z.object({ kind: z.literal("request-help") }).strict(),
            z
              .object({
                kind: z.literal("revive"),
                targetHeroId: z.string().min(1).max(200),
                payment: z.enum(["gold", "debt"]),
              })
              .strict(),
          ])
          .parse(input.command);
        return mutate(input, input, (r, id) => recoverCrew(r, id, command), "social");
      }),
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
                "opener",
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
            !["combat", "route", "camp", "result", "event"].includes(
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
