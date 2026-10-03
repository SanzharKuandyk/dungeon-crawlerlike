import { afterEach, expect, it, vi } from "vitest";
import type { Ack, Envelope } from "../../src/shared/protocol.js";
import type { RoomView } from "../../src/shared/view-types.js";

vi.mock("../../src/client/notify.js", () => ({ notifyError: vi.fn() }));

import { createSessionRequests } from "../../src/client/session-requests.js";

function setup() {
  vi.useFakeTimers();
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  const book = createSessionRequests("test");
  const view = { id: "match", phaseId: 1 } as RoomView;
  const sync = vi.fn();
  return {
    book,
    view,
    context: { view: () => view, available: () => true, disposed: () => false, sync },
    sync,
  };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("a phase snapshot arriving before its acknowledgment does not reject a successful action", async () => {
  const { book, view, context } = setup();
  let acknowledge: Ack = () => {};
  const result = book.send((_env, ack) => (acknowledge = ack), context);
  view.phaseId = 2;
  acknowledge({ ok: true, value: { revision: 4 } });
  await expect(result).resolves.toBe(true);
  expect(book.pending.size).toBe(0);
});

it("lost acknowledgments retry the same ID but past-phase actions only query receipts", async () => {
  const { book, view, context, sync } = setup();
  const sent: Envelope[] = [];
  const result = book.send((env) => sent.push(env), context);
  await vi.advanceTimersByTimeAsync(4000);
  expect(sent).toHaveLength(2);
  expect(sent[0]).toEqual(sent[1]);
  view.phaseId = 2;
  await vi.advanceTimersByTimeAsync(4000);
  expect(sync).toHaveBeenCalledOnce();
  expect(sent).toHaveLength(2);
  book.pending.get(sent[0].requestId)?.finish({ ok: true, value: { revision: 8 } });
  await expect(result).resolves.toBe(true);
});
