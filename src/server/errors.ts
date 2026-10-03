import type { ErrorCode } from "../shared/protocol.js";

export class CommandError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public retryAfterMs?: number,
  ) {
    super(message);
  }
}
export function reject(code: ErrorCode, message: string): never {
  throw new CommandError(code, message);
}
