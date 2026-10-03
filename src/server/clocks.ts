import type { DecisionClock } from "../shared/crew-run-types.js";

export function newClock(durationMs: number, now: number, running: boolean): DecisionClock {
  return {
    deadline: running ? now + durationMs : null,
    remainingMs: durationMs,
    elapsedMs: 0,
    durationMs,
    startedAt: now,
  };
}
export function freezeClock(clock: DecisionClock, now: number) {
  if (clock.deadline === null) return;
  clock.remainingMs = Math.min(clock.durationMs, Math.max(0, clock.deadline - now));
  clock.elapsedMs = Math.max(0, clock.durationMs - clock.remainingMs);
  clock.deadline = null;
}
export function resumeClock(clock: DecisionClock, now: number) {
  if (clock.deadline !== null) return;
  clock.startedAt = now - clock.elapsedMs;
  clock.deadline = now + clock.remainingMs;
}
export function extendClock(clock: DecisionClock, milliseconds: number, now: number) {
  const running = clock.deadline !== null;
  freezeClock(clock, now);
  clock.remainingMs += milliseconds;
  clock.durationMs += milliseconds;
  if (running) resumeClock(clock, now);
}
export function clockView(clock: DecisionClock) {
  return {
    deadline: clock.deadline,
    remaining: clock.deadline === null ? clock.remainingMs : null,
    phaseStartedAt: clock.startedAt,
    phaseDuration: clock.durationMs,
  };
}
