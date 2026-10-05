import type { AfflictionKind, BlessingKind } from "./condition-types.js";
export function blessingDescription(kind: BlessingKind, rank: 1 | 2, power: number) {
  switch (kind) {
    case "iron-nerve":
      return `Prevent the first ${rank} stress gained each encounter.`;
    case "opener":
      return `First damaging action each encounter gains ${rank * power} damage.`;
    case "last-stand":
      return `First fall below half health each encounter reserves ${rank * power} Block for the next turn.`;
    case "field-medic":
      return `First healing action or draught each encounter gains ${rank * power} healing.`;
    case "clear-purpose":
      return `First Block each encounter removes ${rank} additional stress.`;
    case "second-breath":
      return `Once per expedition, survive lethal damage at ${rank === 1 ? 1 : power} health. Revival does not restore this use.`;
  }
}
export const AFFLICTION_DETAILS: Record<AfflictionKind, string> = {
  shaken: "First damaging enemy hit each encounter adds 1 stress.",
  doubtful: "First damaging action each encounter deals power less damage.",
  brittle: "Barriers received are 25% weaker.",
  haunted: "Camp Rest removes 1 less stress.",
};
