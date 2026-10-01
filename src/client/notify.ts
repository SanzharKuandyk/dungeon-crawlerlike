import { toast } from "svelte-sonner";

const recent = new Map<string, number>();
export function notifyError(message: string, code = "ERROR") {
  const key = `${code}:${message}`,
    now = Date.now();
  if (now - (recent.get(key) ?? 0) < 5000) return;
  recent.set(key, now);
  if (recent.size > 100) recent.delete(recent.keys().next().value ?? "");
  toast.error(message, { id: key, duration: 5500 });
}
