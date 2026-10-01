import type { StoredRoom } from "./room-types.js";

export function cloneRoom(room: StoredRoom): StoredRoom {
  // Frozen content and archived events are never edited by a command.
  const { history, events, content, ...state } = room.state;
  const draft = structuredClone({
    ...room,
    processed: {},
    state: {
      ...state,
      history: [],
      events: [],
      content: { classes: [], rooms: [], questions: [] },
    },
  }) as StoredRoom;
  draft.processed = { ...room.processed };
  draft.state.content = content;
  draft.state.history = [...history];
  draft.state.events = [...events];
  return draft;
}
