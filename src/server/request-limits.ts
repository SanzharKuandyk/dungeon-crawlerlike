import { CommandError } from "./errors.js";

export function createLimits() {
  const buckets = new Map<string, { tokens: number; at: number }>();
  const windows = new Map<string, number[]>();
  return {
    window(key: string, count: number, milliseconds: number, now: number) {
      const timestamps = (windows.get(key) ?? []).filter((at) => now - at < milliseconds);
      if (timestamps.length >= count)
        throw new CommandError(
          "RATE_LIMITED",
          "Too many attempts. Try again shortly.",
          Math.max(1, milliseconds - (now - timestamps[0])),
        );
      timestamps.push(now);
      windows.set(key, timestamps);
      if (windows.size > 10000)
        for (const [id, times] of windows)
          if (now - times[times.length - 1] >= 600000) windows.delete(id);
    },
    consume(key: string, capacity: number, perMs: number, now: number) {
      const previous = buckets.get(key) ?? { tokens: capacity, at: now };
      const tokens = Math.min(capacity, previous.tokens + Math.max(0, now - previous.at) * perMs);
      if (tokens < 1)
        throw new CommandError(
          "RATE_LIMITED",
          "Too many requests. Try again shortly.",
          Math.ceil((1 - tokens) / perMs),
        );
      buckets.set(key, { tokens: tokens - 1, at: now });
      if (buckets.size > 10000)
        for (const [id, value] of buckets) if (now - value.at > 600000) buckets.delete(id);
    },
    remove(key: string) {
      buckets.delete(key);
      windows.delete(key);
    },
  };
}
