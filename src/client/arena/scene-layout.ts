export const SCENE_READOUT_HEIGHT = 104;
export const sceneHeight = (rows: boolean) => (rows ? 1000 : 580);
export const actorY = (index: number, rows: boolean) => (rows ? (index < 2 ? 350 : 850) : 436);
export const enemyX = (index: number, count: number, rows = false) =>
  rows ? 160 + (index % 2) * 280 : count === 1 ? 245 : 80 + ((index + 0.5) * 480) / count;
export const heroX = (index: number, count: number, rows = false) =>
  rows ? 740 + (index % 2) * 280 : 560 + ((index + 0.5) * 640) / Math.max(1, count);

// Keep native-size health/build controls below the actors without stretching the artwork.
export function sceneFrame(width: number, height: number, rows: boolean, combatHud: boolean) {
  const worldHeight = sceneHeight(rows);
  const ground = actorY(rows ? 2 : 0, rows);
  const scale = Math.max(
    0,
    Math.min(
      width / 1200,
      combatHud ? (height - SCENE_READOUT_HEIGHT) / ground : height / worldHeight,
    ),
  );
  const artHeight = combatHud ? Math.min(height, worldHeight * scale) : height;
  return {
    scale,
    left: (width - 1200 * scale) / 2,
    top: (artHeight - worldHeight * scale) / 2,
    artHeight,
  };
}
