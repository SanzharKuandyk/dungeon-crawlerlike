import type { StoredRoom } from "./room-types.js";

export function cloneRoom(room: StoredRoom): StoredRoom {
  // Frozen content and archived events are never edited by a command.
  const { history, events, content, ...state } = room.state;
  const runs = Object.fromEntries(
    Object.entries(room.runs).map(([id, run]) => [
      id,
      {
        ...run,
        progress: { ...run.progress, before: null, events: [] },
      },
    ]),
  );
  const draft = structuredClone({
    ...room,
    processed: {},
    runs,
    state: {
      ...state,
      history: [],
      events: [],
      content: { classes: [], rooms: [], questions: [] },
    },
  }) as StoredRoom;
  for (const [id, run] of Object.entries(draft.runs)) {
    run.progress.before = room.runs[id].progress.before;
    run.progress.events = room.runs[id].progress.events;
  }
  draft.processed = { ...room.processed };
  draft.state.content = content;
  draft.state.history = [...history];
  draft.state.events = [...events];
  return draft;
}
