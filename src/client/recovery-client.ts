import { secureSecret } from "./connection.js";
import { notifyError } from "./notify.js";
import { browserStorage } from "./storage.js";
export function newRecoveryCode() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  return [...crypto.getRandomValues(new Uint8Array(12))].map((n) => alphabet[n % 32]).join("");
}
export async function recoverHost(code: string, installationKey: string) {
  const key = `dungeon-host-recovery:${code}`;
  const secret = browserStorage.getItem(key) ?? secureSecret();
  if (!browserStorage.setItem(key, secret)) return false;
  const initialRoute = location.hash;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch("/api/host/recover", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, installationKey, bootstrapSecret: secret }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    browserStorage.setItem(`siege-session:${code}:host`, secret);
    browserStorage.removeItem(key);
    if (location.hash !== initialRoute) return false;
    location.hash = `#/host/${code}`;
    return true;
  } catch (error) {
    notifyError(error instanceof Error ? error.message : "Host recovery failed.");
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
