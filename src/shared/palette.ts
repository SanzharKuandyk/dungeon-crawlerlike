export const NEUTRALS = {
  background: "#fafaf9",
  surface: "#ffffff",
  text: "#18181b",
  muted: "#65656b",
  border: "#dedee2",
  grid: "#eeeeef",
  hover: "#f3f3f2",
  primaryHover: "#343438",
  floor: "#f6f6f3",
  selected: "#f5f5f4",
  soft: "#f3f3ef",
  strongBorder: "#a1a1aa",
  pad: "#f0f0ed",
  onTeam: "#ffffff",
  overlay: "rgba(250, 250, 249, 0.8)",
  shadow: "rgba(24, 24, 27, 0.07)",
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
