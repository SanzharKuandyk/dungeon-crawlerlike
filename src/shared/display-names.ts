import type { HeroAction } from "./command-types.js";
import type { ClassId } from "./content-types.js";

// Display names can change without invalidating saved character and command IDs.
export const CLASS_NAMES: Record<ClassId, string> = {
  knight: "Knight",
  physician: "Healer",
  occultist: "Mage",
  scavenger: "Thief",
  wanderer: "Fighter",
  exorcist: "Priest",
};
export const ACTION_NAMES: Record<HeroAction["kind"], string> = {
  attack: "Attack",
  brace: "Block",
  "use-item": "Item",
  protect: "Protect",
  mend: "Heal",
  hex: "Blast",
  pilfer: "Steal",
  skirmish: "Hit & Block",
  channel: "Drain",
  ward: "Shield ally",
  observe: "Wait",
};
export const CLASS_SKILLS = {
  knight: "protect",
  physician: "mend",
  occultist: "hex",
  scavenger: "pilfer",
  wanderer: "skirmish",
  exorcist: "channel",
} as const;

export const CLASS_PURPOSES: Record<ClassId, string> = {
  knight: "Protect a character from this turn’s attack.",
  physician: "Restore a character’s health and stop Bleed.",
  occultist: "Heavy damage at the cost of personal stress.",
  scavenger: "Attack and take gold once per fight.",
  wanderer: "Attack while protecting yourself.",
  exorcist: "Attack, heal yourself and reduce stress.",
};
