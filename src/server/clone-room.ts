import { bindProgress } from "./progress-bindings.js";
import type { StoredRoom } from "./room-types.js";
export function cloneRoom(room: StoredRoom): StoredRoom {
  const {
    history,
    content,
    trialPack,
    chapterMaps,
    expeditionMap,
    offeredRooms,
    crewProgress,
    before,
    events,
    ...state
  } = room.state;
  const draft = structuredClone({
    ...room,
    processed: {},
    state: {
      ...state,
      history: [],
      content: { classes: [], rooms: [] },
      trialPack: { fixture: true, categories: ["", "", ""], questions: [] },
      chapterMaps: [],
      expeditionMap: undefined,
      offeredRooms: [],
      before: null,
      events: [],
      crewProgress: Object.fromEntries(
        Object.entries(crewProgress).map(([id, p]) => [id, { ...p, before: null, events: [] }]),
      ),
    },
  }) as StoredRoom;
  // Authored maps and published event payloads are immutable between mutations.
  draft.state.history = [...history];
  draft.state.content = content;
  draft.state.trialPack = trialPack;
  draft.state.chapterMaps = chapterMaps;
  draft.state.expeditionMap = expeditionMap;
  draft.state.offeredRooms = offeredRooms;
  draft.state.before = before;
  draft.state.events = [...events];
  for (const [id, p] of Object.entries(crewProgress)) {
    draft.state.crewProgress[id].before = p.before;
    draft.state.crewProgress[id].events = [...p.events];
  }
  draft.processed = { ...room.processed };
  bindProgress(draft);
  return draft;
}
