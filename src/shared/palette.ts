export const NEUTRALS = {
  background: "#ffffff",
  surface: "#ffffff",
  text: "#18181b",
  muted: "#65656b",
  border: "#8b8b92",
  grid: "#eeeeef",
  hover: "#f4f4f4",
  primaryHover: "#343438",
  floor: "#f6f6f3",
  selected: "#f4f4f4",
  soft: "#ffffff",
  strongBorder: "#3f3f46",
  pad: "#f0f0ed",
  onTeam: "#ffffff",
  overlay: "rgba(250, 250, 249, 0.8)",
  shadow: "rgba(24, 24, 27, 0.07)",
  stoneWall: "#eeede8",
  stoneFloor: "#e5e3db",
  stoneLine: "#b8b6ae",
  stoneBorder: "#d3d1c9",
  intentSurface: "#f8f7f3",
  contactShadow: "rgba(24, 24, 27, 0.15)",
  healthFill: "#256b45",
  stressFill: "#9d6a18",
  sealFill: "#6d5797",
} as const;
export const NODE_COLORS: Record<MapNodeKind, string> = {
  battle: "#6b493e",
  elite: "#9c3d2e",
  boss: "#9c3d2e",
  arena: "#6b493e",
  merchant: "#936d1e",
  treasure: "#936d1e",
  camp: "#4c7252",
  shrine: "#4c7252",
  altar: "#6d5797",
  siege: "#286e9b",
  event: "#6d5797",
};
export const TEAM_COLORS = [
  { id: "blue", name: "Blue", hex: "#2563eb" },
  { id: "orange", name: "Orange", hex: "#c2410c" },
  { id: "teal", name: "Teal", hex: "#0f766e" },
  { id: "purple", name: "Purple", hex: "#7c3aed" },
  { id: "rose", name: "Rose", hex: "#be185d" },
  { id: "olive", name: "Olive", hex: "#4d7c0f" },
  { id: "cyan", name: "Cyan", hex: "#0e7490" },
  { id: "red", name: "Red", hex: "#b91c1c" },
] as const;
export function teamColor(id: string) {
  return TEAM_COLORS.find((c) => c.id === id) ?? TEAM_COLORS[0];
}
export const colorNumber = (hex: string) => Number.parseInt(hex.slice(1), 16);

export const ANSWER_COLORS = ["#275da8", "#9b5417", "#7150a0", "#147568"] as const;

export const GAME_COLORS = {
  attack: "#b33e27",
  protection: "#286e9b",
  healing: "#23794b",
  magic: "#7950a4",
  gold: "#956613",
  stress: "#a86616",
} as const;

export function iconColor(name: string): string | undefined {
  if (["heart", "draught", "healer-charm", "revive", "field-medic", "second-breath"].includes(name))
    return GAME_COLORS.healing;
  if (["shield", "armor", "ward-vest", "guard-coat", "last-stand"].includes(name))
    return GAME_COLORS.protection;
  if (["weapon", "blade", "bleed", "arm", "leg", "curse"].includes(name)) return GAME_COLORS.attack;
  if (["stress", "tonic", "calm-charm", "iron-nerve"].includes(name)) return GAME_COLORS.stress;
  if (["seal", "piercing-blade", "blessing", "charm"].includes(name)) return GAME_COLORS.magic;
  if (["gold", "merchant", "boss"].includes(name)) return GAME_COLORS.gold;
}

import type { MapNodeKind } from "./map-types.js";
