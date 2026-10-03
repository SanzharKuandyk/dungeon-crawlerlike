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
} as const;
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
