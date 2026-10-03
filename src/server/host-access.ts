import { timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { reject } from "./errors.js";
import { hashToken, newToken } from "./sessions.js";
export async function loadHostAccess() {
  const path = resolve("data/host-access.key");
  await mkdir(resolve("data"), { recursive: true });
  try {
    await writeFile(path, newToken(), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
  }
  const key = (await readFile(path, "utf8")).trim();
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error(`Invalid installation key at ${path}`);
  console.info(`Host recovery key file: ${path}`);
  return key;
}
export function requireHostAccess(expected: string, supplied: unknown) {
  if (
    typeof supplied !== "string" ||
    !/^[a-f0-9]{64}$/.test(supplied) ||
    !timingSafeEqual(Buffer.from(hashToken(expected)), Buffer.from(hashToken(supplied)))
  )
    reject("UNAUTHORIZED", "Enter the host recovery key from data/host-access.key.");
}
