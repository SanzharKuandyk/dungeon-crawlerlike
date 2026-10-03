import { notifyError } from "./notify.js";

let reported = false;
function report() {
  if (!reported) {
    reported = true;
    notifyError("Browser storage is unavailable. Device recovery cannot be saved.", "STORAGE");
  }
}
export const browserStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      report();
      return null;
    }
  },
  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      report();
      return false;
    }
  },
  removeItem(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      report();
    }
  },
};
